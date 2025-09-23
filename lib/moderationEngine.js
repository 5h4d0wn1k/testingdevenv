/**
 * Moderation Engine for product approval workflow
 */

export class ModerationEngine {
    /**
     * Determine if a product should be auto-approved
     * @param {Object} product - Product object
     * @param {Object} store - Store object
     * @returns {Object} - Decision result
     */
    static evaluateAutoApproval(product, store) {
        const reasons = []
        let autoApprove = true

        // Check store reputation
        if (store.vendorStatus !== 'APPROVED') {
            reasons.push('Store not fully approved')
            autoApprove = false
        }

        // Check product content for policy violations
        const contentCheck = this.checkContentPolicy(product)
        if (!contentCheck.passed) {
            reasons.push(...contentCheck.violations)
            autoApprove = false
        }

        // Check pricing reasonableness
        const priceCheck = this.checkPricing(product)
        if (!priceCheck.reasonable) {
            reasons.push(priceCheck.reason)
            autoApprove = false
        }

        // Check for suspicious patterns
        const patternCheck = this.checkSuspiciousPatterns(product, store)
        if (patternCheck.suspicious) {
            reasons.push(...patternCheck.reasons)
            autoApprove = false
        }

        // Check store performance metrics
        const performanceCheck = this.checkStorePerformance(store)
        if (!performanceCheck.goodStanding) {
            reasons.push(performanceCheck.reason)
            autoApprove = false
        }

        return {
            autoApprove,
            reasons,
            riskLevel: this.calculateRiskLevel(reasons),
            recommendedAction: autoApprove ? 'auto_approve' : 'manual_review'
        }
    }

    /**
     * Check product content against policies
     */
    static checkContentPolicy(product) {
        const violations = []

        // Check for prohibited keywords
        const prohibitedKeywords = [
            'illegal', 'prohibited', 'banned', 'counterfeit',
            'stolen', 'hacked', 'exploit', 'malware'
        ]

        const content = `${product.name} ${product.description}`.toLowerCase()

        for (const keyword of prohibitedKeywords) {
            if (content.includes(keyword)) {
                violations.push(`Contains prohibited keyword: ${keyword}`)
            }
        }

        // Check description length
        if (product.description.length < 10) {
            violations.push('Description too short')
        }

        // Check for excessive caps
        const capsRatio = (product.name.match(/[A-Z]/g) || []).length / product.name.length
        if (capsRatio > 0.7) {
            violations.push('Excessive use of capital letters')
        }

        // Check image count
        if (!product.images || product.images.length < 1) {
            violations.push('Insufficient product images')
        }

        return {
            passed: violations.length === 0,
            violations
        }
    }

    /**
     * Check if pricing is reasonable
     */
    static checkPricing(product) {
        // This would typically involve market data comparison
        // For now, use basic sanity checks

        if (product.price <= 0) {
            return { reasonable: false, reason: 'Invalid price' }
        }

        if (product.mrp && product.price > product.mrp * 2) {
            return { reasonable: false, reason: 'Price significantly higher than MRP' }
        }

        // Check for suspiciously low prices
        if (product.price < 0.01) {
            return { reasonable: false, reason: 'Price too low' }
        }

        return { reasonable: true }
    }

    /**
     * Check for suspicious patterns
     */
    static checkSuspiciousPatterns(product, store) {
        const reasons = []
        let suspicious = false

        // Check if store has many flagged products
        // This would require querying the database

        // Check for rapid product creation
        // This would require checking creation timestamps

        // Check for duplicate content
        // This would require content analysis

        return {
            suspicious,
            reasons
        }
    }

    /**
     * Check store performance and standing
     */
    static checkStorePerformance(store) {
        // This would check store metrics like:
        // - Order fulfillment rate
        // - Customer satisfaction
        // - Return/refund rates
        // - Previous violations

        // For now, basic check
        if (store.vendorStatus === 'SUSPENDED') {
            return {
                goodStanding: false,
                reason: 'Store is suspended'
            }
        }

        return { goodStanding: true }
    }

    /**
     * Calculate risk level based on violations
     */
    static calculateRiskLevel(reasons) {
        if (reasons.length === 0) return 'low'
        if (reasons.length <= 2) return 'medium'
        return 'high'
    }

    /**
     * Apply moderation decision to product
     */
    static async applyModerationDecision(productId, decision, moderatedBy, reason = null) {
        const prisma = (await import('@/lib/prisma')).default

        let moderationStatus
        let productStatus

        switch (decision) {
            case 'approve':
                moderationStatus = 'APPROVED'
                productStatus = 'ACTIVE'
                break
            case 'reject':
                moderationStatus = 'REJECTED'
                productStatus = 'ARCHIVED'
                break
            case 'require_changes':
                moderationStatus = 'REQUIRES_CHANGES'
                productStatus = 'DRAFT'
                break
            default:
                throw new Error('Invalid moderation decision')
        }

        // Update product
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
                moderationStatus,
                status: productStatus,
                updatedAt: new Date()
            }
        })

        // Create moderation log
        await prisma.productModerationLog.create({
            data: {
                productId,
                action: decision,
                reason,
                moderatedBy,
                previousStatus: updatedProduct.moderationStatus,
                newStatus: moderationStatus,
                productSnapshot: JSON.stringify({
                    name: updatedProduct.name,
                    description: updatedProduct.description,
                    price: updatedProduct.price,
                    category: updatedProduct.category,
                    images: updatedProduct.images,
                    status: updatedProduct.status
                })
            }
        })

        return updatedProduct
    }

    /**
     * Get moderation statistics
     */
    static async getModerationStats(timeframe = 30) {
        const prisma = (await import('@/lib/prisma')).default
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - timeframe)

        const stats = await prisma.productModerationLog.groupBy({
            by: ['action'],
            where: {
                createdAt: {
                    gte: startDate
                }
            },
            _count: {
                id: true
            }
        })

        const pendingCount = await prisma.product.count({
            where: {
                moderationStatus: 'PENDING'
            }
        })

        return {
            stats: stats.reduce((acc, stat) => {
                acc[stat.action] = stat._count.id
                return acc
            }, {}),
            pendingCount
        }
    }
}