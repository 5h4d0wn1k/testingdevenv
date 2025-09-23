import prisma from '@/lib/prisma';


const authSeller = async (userId) => {
    try {
        console.log('authSeller called with userId:', userId)

        if (!userId) {
            console.log('authSeller: userId is null/undefined')
            return false
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { store: true },
        })

        console.log('authSeller: user found:', user ? { id: user.id, role: user.role, hasStore: !!user.store, storeStatus: user.store?.status } : 'null')

        if(user.store){
            if(user.store.status === 'approved' && (user.role === 'SELLER' || user.role === 'ADMIN')){
                console.log('authSeller: user authorized as seller, returning store id:', user.store.id)
                return user.store.id
            } else {
                console.log('authSeller: store status not approved or role not seller/admin:', { status: user.store.status, role: user.role })
            }
        }else{
            console.log('authSeller: user has no store')
            return false
        }
    } catch (error) {
        console.error('authSeller error:', error)
        return false
    }
}

export default authSeller