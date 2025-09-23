/**
 * Pricing Engine for calculating effective product prices
 * Handles promotions, scheduled changes, and complex pricing rules
 */

export class PricingEngine {
    /**
     * Calculate the effective price for a product at a given time
     * @param {Object} product - Product object with pricing data
     * @param {Date} atTime - Time to calculate price for (defaults to now)
     * @param {Object} context - Additional context (user, quantity, etc.)
     * @returns {Object} - Price calculation result
     */
    static calculateEffectivePrice(product, atTime = new Date(), context = {}) {
        const now = atTime
        let effectivePrice = product.basePrice || product.price
        const appliedPromotions = []
        const priceHistory = []

        // Check scheduled price changes
        if (product.scheduledPriceChanges && product.scheduledPriceChanges.length > 0) {
            const activeChange = product.scheduledPriceChanges.find(change => {
                const startDate = new Date(change.startDate)
                const endDate = change.endDate ? new Date(change.endDate) : null

                return startDate <= now && (!endDate || endDate >= now)
            })

            if (activeChange) {
                effectivePrice = activeChange.price
                priceHistory.push({
                    type: 'scheduled_change',
                    price: activeChange.price,
                    reason: activeChange.reason || 'Scheduled price change'
                })
            }
        }

        // Apply promotion rules
        if (product.promotionRules && product.promotionRules.length > 0) {
            // Sort by priority (higher priority first)
            const sortedRules = product.promotionRules
                .filter(rule => rule.isActive)
                .sort((a, b) => b.priority - a.priority)

            for (const rule of sortedRules) {
                if (this.evaluatePromotionRule(rule, product, context, now)) {
                    const result = this.applyPromotionRule(rule, effectivePrice, context)
                    if (result.applied) {
                        effectivePrice = result.newPrice
                        appliedPromotions.push({
                            ruleId: rule.id,
                            type: rule.type,
                            name: rule.name,
                            discount: result.discount,
                            finalPrice: result.newPrice
                        })

                        // Some promotions might be exclusive
                        if (rule.actions?.exclusive) {
                            break
                        }
                    }
                }
            }
        }

        // Apply legacy promotion fields for backward compatibility
        if (product.promotionType && product.promotionType !== 'none' &&
            product.promotionValue > 0) {

            const startDate = product.promotionStart ? new Date(product.promotionStart) : null
            const endDate = product.promotionEnd ? new Date(product.promotionEnd) : null

            if (!startDate || startDate <= now) {
                if (!endDate || endDate >= now) {
                    const discount = this.calculateLegacyDiscount(
                        product.promotionType,
                        product.promotionValue,
                        effectivePrice
                    )

                    effectivePrice -= discount
                    appliedPromotions.push({
                        type: 'legacy',
                        name: `${product.promotionType} discount`,
                        discount,
                        finalPrice: effectivePrice
                    })
                }
            }
        }

        return {
            originalPrice: product.basePrice || product.price,
            effectivePrice: Math.max(0, effectivePrice), // Ensure non-negative
            appliedPromotions,
            priceHistory,
            currency: product.currency || 'USD',
            isOnSale: appliedPromotions.length > 0,
            discountAmount: (product.basePrice || product.price) - effectivePrice,
            discountPercentage: ((product.basePrice || product.price) - effectivePrice) / (product.basePrice || product.price) * 100
        }
    }

    /**
     * Evaluate if a promotion rule conditions are met
     */
    static evaluatePromotionRule(rule, product, context, currentTime) {
        // Check date validity
        if (rule.startDate && new Date(rule.startDate) > currentTime) {
            return false
        }

        if (rule.endDate && new Date(rule.endDate) < currentTime) {
            return false
        }

        // Check usage limits
        if (rule.usageLimit && rule.usageCount >= rule.usageLimit) {
            return false
        }

        if (rule.perUserLimit && context.userId) {
            // This would need to be checked against user usage history
            // For now, assume it's valid
        }

        // Evaluate conditions
        if (rule.conditions) {
            return this.evaluateConditions(rule.conditions, product, context)
        }

        return true
    }

    /**
     * Evaluate promotion conditions
     */
    static evaluateConditions(conditions, product, context) {
        for (const [key, value] of Object.entries(conditions)) {
            switch (key) {
                case 'minQuantity':
                    if (context.quantity < value) return false
                    break
                case 'maxQuantity':
                    if (context.quantity > value) return false
                    break
                case 'userGroup':
                    if (context.userGroup !== value) return false
                    break
                case 'minOrderValue':
                    if (context.orderValue < value) return false
                    break
                case 'categories':
                    if (!value.includes(product.category)) return false
                    break
                case 'tags':
                    if (!product.tags || !product.tags.some(tag => value.includes(tag))) return false
                    break
                // Add more conditions as needed
            }
        }
        return true
    }

    /**
     * Apply a promotion rule to calculate new price
     */
    static applyPromotionRule(rule, currentPrice, context) {
        let discount = 0
        let applied = false

        switch (rule.type) {
            case 'PERCENTAGE':
                if (rule.actions?.percentage) {
                    discount = currentPrice * (rule.actions.percentage / 100)
                    applied = true
                }
                break

            case 'FIXED':
                if (rule.actions?.amount) {
                    discount = Math.min(rule.actions.amount, currentPrice)
                    applied = true
                }
                break

            case 'BUY_X_GET_Y':
                if (rule.actions?.buyQuantity && rule.actions?.getQuantity &&
                    context.quantity >= (rule.actions.buyQuantity + rule.actions.getQuantity)) {
                    const sets = Math.floor(context.quantity / (rule.actions.buyQuantity + rule.actions.getQuantity))
                    const freeItems = sets * rule.actions.getQuantity
                    discount = freeItems * currentPrice
                    applied = true
                }
                break

            case 'QUANTITY_DISCOUNT':
                if (rule.actions?.tiers && Array.isArray(rule.actions.tiers)) {
                    for (const tier of rule.actions.tiers.sort((a, b) => b.minQuantity - a.minQuantity)) {
                        if (context.quantity >= tier.minQuantity) {
                            if (tier.type === 'percentage') {
                                discount = currentPrice * (tier.value / 100)
                            } else if (tier.type === 'fixed') {
                                discount = tier.value
                            }
                            applied = true
                            break
                        }
                    }
                }
                break

            case 'FLASH_DEAL':
                if (rule.actions?.discountPrice) {
                    discount = currentPrice - rule.actions.discountPrice
                    applied = true
                }
                break

            case 'BUNDLE':
                if (rule.actions?.bundlePrice && context.isBundle) {
                    discount = currentPrice - rule.actions.bundlePrice
                    applied = true
                }
                break
        }

        return {
            applied,
            discount: Math.max(0, discount),
            newPrice: Math.max(0, currentPrice - discount)
        }
    }

    /**
     * Calculate discount for legacy promotion fields
     */
    static calculateLegacyDiscount(type, value, price) {
        switch (type) {
            case 'percentage':
                return price * (value / 100)
            case 'fixed':
                return Math.min(value, price)
            default:
                return 0
        }
    }

    /**
     * Get bulk pricing for multiple quantities
     */
    static getBulkPricing(product, quantities, context = {}) {
        const results = {}

        for (const quantity of quantities) {
            const qtyContext = { ...context, quantity }
            results[quantity] = this.calculateEffectivePrice(product, new Date(), qtyContext)
        }

        return results
    }

    /**
     * Validate promotion rule configuration
     */
    static validatePromotionRule(rule) {
        const errors = []

        if (!rule.name || rule.name.trim().length === 0) {
            errors.push('Name is required')
        }

        switch (rule.type) {
            case 'PERCENTAGE':
                if (!rule.actions?.percentage || rule.actions.percentage <= 0 || rule.actions.percentage > 100) {
                    errors.push('Valid percentage (1-100) required for percentage discount')
                }
                break
            case 'FIXED':
                if (!rule.actions?.amount || rule.actions.amount <= 0) {
                    errors.push('Valid amount required for fixed discount')
                }
                break
            case 'BUY_X_GET_Y':
                if (!rule.actions?.buyQuantity || !rule.actions?.getQuantity ||
                    rule.actions.buyQuantity <= 0 || rule.actions.getQuantity <= 0) {
                    errors.push('Valid buy and get quantities required')
                }
                break
            // Add validation for other types
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }
}