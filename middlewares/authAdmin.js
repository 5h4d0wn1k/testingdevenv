import { clerkClient } from "@clerk/nextjs/server"
import prisma from "../lib/prisma.js"


const authAdmin = async (userId) => {
    try {
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

export default authAdmin