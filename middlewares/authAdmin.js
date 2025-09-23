import { clerkClient, getAuth } from "@clerk/nextjs/server"
import prisma from "../lib/prisma.js"
import { NextResponse } from "next/server"


const authAdmin = async (arg) => {
    if (typeof arg === 'function') {
        // It's the handler, return wrapper
        return async (request, params) => {
            try {
                const { userId } = getAuth(request)
                if (!userId) return NextResponse.json({ error: 'not authorized' }, { status: 401 })

                console.log('authAdmin wrapper called with userId type:', typeof userId, 'value:', userId)

                // Check role from database
                const dbUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { role: true }
                })

                if (dbUser && dbUser.role === 'ADMIN') {
                    return arg(request, params)
                }

                // Fallback to email check for backward compatibility during transition
                const client = await clerkClient()
                const user = await client.users.getUser(userId)

                if (process.env.ADMIN_EMAIL.split(',').includes(user.emailAddresses[0].emailAddress)) {
                    return arg(request, params)
                }

                return NextResponse.json({ error: 'not authorized' }, { status: 401 })
            } catch (error) {
                console.error(error)
                return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
            }
        }
    } else {
        // It's userId, do the check
        const userId = arg
        try {
            console.log('authAdmin called with userId type:', typeof userId, 'value:', userId)
            if(!userId) return false

            // Check role from database
            const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true }
            })

            if (dbUser && dbUser.role === 'ADMIN') {
                return true
            }

            // Fallback to email check for backward compatibility during transition
            const client = await clerkClient()
            const user = await client.users.getUser(userId)

            return process.env.ADMIN_EMAIL.split(',').includes(user.emailAddresses[0].emailAddress)
        } catch (error) {
            console.error(error)
            return false
        }
    }
}

export default authAdmin