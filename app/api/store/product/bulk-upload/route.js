import imagekit from "@/configs/imageKit"
import prisma from "@/lib/prisma"
import authSeller from "@/middlewares/authSeller"
import { getAuth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { productSchema } from "@/lib/validations"
import { rateLimit } from "@/lib/rateLimit"
import ExcelJS from 'exceljs'

export async function POST(request) {
    try {
        // Rate limiting: 10 requests per minute
        const rateLimitResponse = await rateLimit(request, 10, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        if (!storeId) {
            return NextResponse.json({ error: 'not authorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file')

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Validate file type
        const isCSV = file.name.endsWith('.csv')
        const isXLS = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

        if (!isCSV && !isXLS) {
            return NextResponse.json({ error: 'File must be CSV or XLS/XLSX' }, { status: 400 })
        }

        let parsedData = []

        if (isCSV) {
            // Parse CSV
            const csvText = await file.text()
            const lines = csvText.split('\n').filter(line => line.trim())
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

            // Validate required headers
            const requiredHeaders = ['name', 'description', 'price', 'category']
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

            if (missingHeaders.length > 0) {
                return NextResponse.json({
                    error: `Missing required columns: ${missingHeaders.join(', ')}`
                }, { status: 400 })
            }

            // Process each line (skip header)
            for (let i = 1; i < lines.length && i <= 1001; i++) { // Max 1000 products + header
                const values = lines[i].split(',').map(v => v.trim())
                if (values.length === 0 || values.every(v => !v)) continue

                try {
                    const productData = {}
                    headers.forEach((header, index) => {
                        const value = values[index] || ''
                        if (header === 'price' || header === 'mrp' || header === 'stock' || header === 'promotionvalue') {
                            productData[header] = value ? parseFloat(value) : 0
                        } else if (header === 'promotionstart' || header === 'promotionend') {
                            productData[header] = value ? new Date(value) : null
                        } else {
                            productData[header] = value
                        }
                    })
                    parsedData.push(productData)
                } catch (error) {
                    errors.push(`Row ${i}: ${error.message}`)
                }
            }
        } else {
            // Parse XLS/XLSX using ExcelJS
            const buffer = await file.arrayBuffer()
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(buffer)

            const worksheet = workbook.worksheets[0] // Get first worksheet

            if (!worksheet || worksheet.rowCount === 0) {
                return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
            }

            // Get headers from first row
            const headerRow = worksheet.getRow(1)
            const headers = []
            headerRow.eachCell((cell, colNumber) => {
                headers.push((cell.value || '').toString().trim().toLowerCase())
            })

            // Validate required headers
            const requiredHeaders = ['name', 'description', 'price', 'category']
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

            if (missingHeaders.length > 0) {
                return NextResponse.json({
                    error: `Missing required columns: ${missingHeaders.join(', ')}`
                }, { status: 400 })
            }

            // Process each row (skip header)
            for (let i = 2; i <= worksheet.rowCount && i <= 1001; i++) { // Max 1000 products + header
                const row = worksheet.getRow(i)

                // Check if row is empty
                let isEmpty = true
                row.eachCell(cell => {
                    if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                        isEmpty = false
                    }
                })
                if (isEmpty) continue

                try {
                    const productData = {}
                    headers.forEach((header, index) => {
                        const cell = row.getCell(index + 1) // ExcelJS uses 1-based indexing
                        let value = cell.value || ''

                        if (header === 'price' || header === 'mrp' || header === 'stock' || header === 'promotionvalue') {
                            productData[header] = value ? parseFloat(value.toString()) : 0
                        } else if (header === 'promotionstart' || header === 'promotionend') {
                            productData[header] = value ? new Date(value.toString()) : null
                        } else {
                            productData[header] = value.toString()
                        }
                    })
                    parsedData.push(productData)
                } catch (error) {
                    errors.push(`Row ${i}: ${error.message}`)
                }
            }
        }

        const products = []
        const errors = []

        // Process parsed data
        parsedData.forEach((productData, index) => {
            try {
                // Validate product data
                const validation = productSchema.safeParse({
                    name: productData.name,
                    description: productData.description,
                    mrp: productData.mrp || productData.price,
                    price: productData.price,
                    category: productData.category
                })

                if (!validation.success) {
                    errors.push(`Row ${index + 2}: ${validation.error.errors.map(e => e.message).join(', ')}`)
                    return
                }

                products.push({
                    name: productData.name,
                    description: productData.description,
                    mrp: productData.mrp || productData.price,
                    price: productData.price,
                    category: productData.category,
                    sku: productData.sku || null,
                    stock: productData.stock || 0,
                    promotionType: productData.promotiontype || 'none',
                    promotionValue: productData.promotionvalue || 0,
                    promotionStart: productData.promotionstart,
                    promotionEnd: productData.promotionend,
                    images: [] // Will be updated later with actual images
                })

            } catch (error) {
                errors.push(`Row ${index + 2}: ${error.message}`)
            }
        })

        if (products.length === 0) {
            return NextResponse.json({ error: 'No valid products found in CSV' }, { status: 400 })
        }

        // Bulk insert products
        const createdProducts = []
        for (const product of products) {
            try {
                const createdProduct = await prisma.product.create({
                    data: {
                        ...product,
                        storeId,
                        inStock: product.stock > 0
                    }
                })

                // Create inventory log
                if (product.stock > 0) {
                    await prisma.inventoryLog.create({
                        data: {
                            productId: createdProduct.id,
                            changeType: 'bulk_upload',
                            quantity: product.stock,
                            reason: 'Bulk CSV upload'
                        }
                    })
                }

                createdProducts.push(createdProduct)
            } catch (error) {
                errors.push(`${product.name}: ${error.message}`)
            }
        }

        return NextResponse.json({
            message: 'Bulk upload completed',
            successful: createdProducts.length,
            errors
        })

    } catch (error) {
        console.error(error)
        return NextResponse.json({
            error: error.code || error.message
        }, { status: 400 })
    }
}