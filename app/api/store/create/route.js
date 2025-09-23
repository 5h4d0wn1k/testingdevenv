import imagekit from "@/configs/imageKit";
import prisma from "@/lib/prisma";
import { getAuth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { storeCreateSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { sendNotification } from "@/lib/notifications";

// create the store
export async function POST(request){
    try {
        // Rate limiting: 5 requests per minute for authentication endpoints
        const rateLimitResponse = await rateLimit(request, 5, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const {userId} = getAuth(request)
        console.log('Store create POST - userId:', userId)

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Ensure user exists in DB
        let user = await prisma.user.findUnique({
            where: {id: userId}
        })

        if (!user) {
            const clerkUser = await currentUser()
            if (!clerkUser) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
            }
            user = await prisma.user.create({
                data: {
                    id: userId,
                    name: clerkUser.firstName + ' ' + clerkUser.lastName,
                    email: clerkUser.emailAddresses[0].emailAddress,
                    image: clerkUser.imageUrl
                }
            })
        }

        // Get the data from the form
        const formData = await request.formData()

        const name = formData.get("name")
        const username = formData.get("username").trim()
        const description = formData.get("description")
        const email = formData.get("email")
        const contact = formData.get("contact")
        const address = formData.get("address")
        const image = formData.get("image")

        // Business details
        const businessName = formData.get("businessName")
        const taxId = formData.get("taxId")
        const businessAddress = formData.get("businessAddress")
        const contactPerson = formData.get("contactPerson")
        const phone = formData.get("phone")
        const website = formData.get("website")
        const businessDescription = formData.get("businessDescription")

        // KYC
        const idDocumentType = formData.get("idDocumentType")
        const idDocumentNumber = formData.get("idDocumentNumber")
        const businessLicenseNumber = formData.get("businessLicenseNumber")
        const kycDocuments = JSON.parse(formData.get("kycDocuments") || "[]")

        // Terms
        const termsAccepted = formData.get("termsAccepted") === "true"

        const validation = storeCreateSchema.safeParse({name, username, description, email, contact, address})
        if (!validation.success) {
            return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
        }

        if (!image) {
            return NextResponse.json({error: "missing logo"}, {status: 400})
        }

        // Validate required business fields
        if (!businessName || !businessAddress || !contactPerson || !phone) {
            return NextResponse.json({ error: 'Missing required business fields' }, { status: 400 })
        }

        if (!termsAccepted) {
            return NextResponse.json({ error: 'Terms must be accepted' }, { status: 400 })
        }

        const { name: validatedName, username: validatedUsername, description: validatedDescription, email: validatedEmail, contact: validatedContact, address: validatedAddress } = validation.data

        // check is user have already registered a store
        const store = await prisma.store.findFirst({
            where: { userId: userId}
        })

        // if store is already registered then send status of store
        if(store){
            return NextResponse.json({status: store.status})
        }

        // check is username is already taken
        const isUsernameTaken = await prisma.store.findFirst({
            where: { username: validatedUsername.toLowerCase() }
        })

        if(isUsernameTaken){
            return NextResponse.json({error: "username already taken"}, {status: 400})
        }

        // image upload to imagekit
        const buffer = Buffer.from(await image.arrayBuffer());
        const response = await imagekit.upload({
            file: buffer,
            fileName: image.name,
            folder: "logos"
        })

        const optimizedImage = imagekit.url({
            path: response.filePath,
            transformation: [
                {quality: 'auto'},
                { format: 'webp' },
                { width: '512' }
            ]
        })

        const newStore = await prisma.$transaction(async (tx) => {
            const store = await tx.store.create({
                data: {
                    userId,
                    name: validatedName,
                    description: validatedDescription,
                    username: validatedUsername.toLowerCase(),
                    email: validatedEmail,
                    contact: validatedContact,
                    address: validatedAddress,
                    logo: optimizedImage
                }
            })
            console.log('Store created successfully:', { storeId: store.id, userId, status: store.status })

            // Create VendorProfile
            const vendorProfile = await tx.vendorProfile.create({
                data: {
                    storeId: store.id,
                    businessName,
                    taxId,
                    businessAddress,
                    contactPerson,
                    phone,
                    website,
                    description: businessDescription,
                    idDocumentType,
                    idDocumentNumber,
                    businessLicenseNumber,
                    termsAccepted
                }
            })
            console.log('VendorProfile created:', { profileId: vendorProfile.id })

            // Create VendorDocuments
            if (kycDocuments && kycDocuments.length > 0) {
                await tx.vendorDocument.createMany({
                    data: kycDocuments.map(doc => ({
                        storeId: store.id,
                        documentType: doc.documentType || 'kyc',
                        documentUrl: doc.documentUrl,
                        status: 'pending'
                    }))
                })
                console.log('VendorDocuments created:', kycDocuments.length)
            }

            // link store to user and set role to SELLER
            await tx.user.update({
                where: { id: userId },
                data: {
                    store: { connect: { id: store.id } },
                    role: 'SELLER'
                }
            })
            console.log('User linked to store and role set to SELLER:', { userId, storeId: store.id })

            return store
        })

        sendNotification('newUser', { storeName: newStore.name, userEmail: newStore.email, username: newStore.username })

        return NextResponse.json({message: "applied, waiting for approval"})

    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, { status: 400 })
    }
}

// check is user have already registered a store if yes then send status of store

export async function GET(request) {
    try {
        // Rate limiting: 5 requests per minute for authentication endpoints
        const rateLimitResponse = await rateLimit(request, 5, 60 * 1000);
        if (rateLimitResponse) return rateLimitResponse;

        const {userId} = getAuth(request)

        // check is user have already registered a store
        const store = await prisma.store.findFirst({
            where: { userId: userId}
        })

        // if store is already registered then send status of store
        if(store){
            return NextResponse.json({status: store.status})
        }

        return NextResponse.json({status: "not registered"})
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, { status: 400 })
    }
}