const axios = require('axios');

// Shipping service for carrier integrations
class ShippingService {
    constructor() {
        this.carriers = {
            DHL: {
                apiUrl: process.env.DHL_API_URL,
                apiKey: process.env.DHL_API_KEY,
                accountNumber: process.env.DHL_ACCOUNT_NUMBER
            },
            FEDEX: {
                apiUrl: process.env.FEDEX_API_URL,
                apiKey: process.env.FEDEX_API_KEY,
                accountNumber: process.env.FEDEX_ACCOUNT_NUMBER
            },
            BLUE_DART: {
                apiUrl: process.env.BLUE_DART_API_URL,
                apiKey: process.env.BLUE_DART_API_KEY,
                accountNumber: process.env.BLUE_DART_ACCOUNT_NUMBER
            }
        };
    }

    // Create shipment with carrier
    async createShipment(carrier, shipmentData) {
        try {
            const carrierConfig = this.carriers[carrier.toUpperCase()];
            if (!carrierConfig) {
                throw new Error(`Unsupported carrier: ${carrier}`);
            }

            let response;

            switch (carrier.toUpperCase()) {
                case 'DHL':
                    response = await this.createDhlShipment(carrierConfig, shipmentData);
                    break;
                case 'FEDEX':
                    response = await this.createFedexShipment(carrierConfig, shipmentData);
                    break;
                case 'BLUE_DART':
                    response = await this.createBlueDartShipment(carrierConfig, shipmentData);
                    break;
                default:
                    throw new Error(`Unsupported carrier: ${carrier}`);
            }

            // Register webhook for tracking updates
            try {
                await this.registerWebhook(carrier, carrierConfig, response.trackingNumber);
            } catch (webhookError) {
                console.warn(`Failed to register webhook for ${carrier}:`, webhookError);
                // Don't fail the shipment creation if webhook registration fails
            }

            return response;
        } catch (error) {
            console.error(`Shipping error for ${carrier}:`, error);
            throw error;
        }
    }

    // DHL shipment creation
    async createDhlShipment(config, data) {
        const payload = {
            plannedShippingDateAndTime: new Date().toISOString(),
            pickup: {
                isRequested: false
            },
            productCode: 'D',
            accounts: [{
                typeCode: 'shipper',
                number: config.accountNumber
            }],
            customerDetails: {
                shipperDetails: {
                    postalAddress: {
                        postalCode: data.from.postalCode,
                        cityName: data.from.city,
                        countryCode: data.from.country,
                        addressLine1: data.from.address
                    },
                    contactInformation: {
                        email: data.from.email,
                        phone: data.from.phone,
                        companyName: data.from.company
                    }
                },
                receiverDetails: {
                    postalAddress: {
                        postalCode: data.to.postalCode,
                        cityName: data.to.city,
                        countryCode: data.to.country,
                        addressLine1: data.to.address
                    },
                    contactInformation: {
                        email: data.to.email,
                        phone: data.to.phone,
                        companyName: data.to.company || data.to.name
                    }
                }
            },
            content: {
                packages: data.packages.map(pkg => ({
                    weight: pkg.weight,
                    dimensions: {
                        length: pkg.length,
                        width: pkg.width,
                        height: pkg.height
                    }
                })),
                isCustomsDeclarable: false,
                description: data.description || 'Order shipment'
            }
        };

        const response = await axios.post(`${config.apiUrl}/shipments`, payload, {
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return {
            trackingNumber: response.data.shipmentTrackingNumber,
            labelUrl: response.data.documents?.[0]?.url,
            carrier: 'DHL'
        };
    }

    // FedEx shipment creation
    async createFedexShipment(config, data) {
        const payload = {
            accountNumber: {
                value: config.accountNumber
            },
            requestedShipment: {
                shipper: {
                    contact: {
                        personName: data.from.name,
                        phoneNumber: data.from.phone,
                        companyName: data.from.company
                    },
                    address: {
                        streetLines: [data.from.address],
                        city: data.from.city,
                        stateOrProvinceCode: data.from.state,
                        postalCode: data.from.postalCode,
                        countryCode: data.from.country
                    }
                },
                recipients: [{
                    contact: {
                        personName: data.to.name,
                        phoneNumber: data.to.phone,
                        companyName: data.to.company
                    },
                    address: {
                        streetLines: [data.to.address],
                        city: data.to.city,
                        stateOrProvinceCode: data.to.state,
                        postalCode: data.to.postalCode,
                        countryCode: data.to.country
                    }
                }],
                shippingChargesPayment: {
                    paymentType: 'SENDER'
                },
                serviceType: 'FEDEX_GROUND',
                packagingType: 'YOUR_PACKAGING',
                requestedPackageLineItems: data.packages.map(pkg => ({
                    weight: {
                        units: 'LB',
                        value: pkg.weight
                    },
                    dimensions: {
                        length: pkg.length,
                        width: pkg.width,
                        height: pkg.height,
                        units: 'IN'
                    }
                }))
            },
            labelResponseOptions: 'URL_ONLY'
        };

        const response = await axios.post(`${config.apiUrl}/ship/v1/shipments`, payload, {
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
                'X-locale': 'en_US'
            }
        });

        return {
            trackingNumber: response.data.output.transactionShipments[0].masterTrackingNumber,
            labelUrl: response.data.output.transactionShipments[0].pieceResponses[0].packageDocuments[0].url,
            carrier: 'FEDEX'
        };
    }

    // Blue Dart shipment creation
    async createBlueDartShipment(config, data) {
        const payload = {
            Request: {
                Consignee: {
                    ConsigneeName: data.to.name,
                    ConsigneeAddress1: data.to.address,
                    ConsigneeAddress2: '',
                    ConsigneeCity: data.to.city,
                    ConsigneeState: data.to.state,
                    ConsigneePincode: data.to.postalCode,
                    ConsigneeCountry: data.to.country,
                    ConsigneeTelephone: data.to.phone,
                    ConsigneeEmailID: data.to.email
                },
                Services: {
                    ServiceType: 'GROUND',
                    PickupDate: new Date().toISOString().split('T')[0],
                    PickupTime: '10:00'
                },
                ShipDetails: {
                    ShipperName: data.from.name,
                    ShipperAddress1: data.from.address,
                    ShipperCity: data.from.city,
                    ShipperState: data.from.state,
                    ShipperPincode: data.from.postalCode,
                    ShipperCountry: data.from.country,
                    ShipperTelephone: data.from.phone,
                    ShipperEmailID: data.from.email
                },
                ItemDetails: data.packages.map(pkg => ({
                    ItemName: pkg.description || 'Package',
                    ItemQuantity: 1,
                    ItemWeight: pkg.weight,
                    ItemLength: pkg.length,
                    ItemWidth: pkg.width,
                    ItemHeight: pkg.height
                }))
            }
        };

        const response = await axios.post(`${config.apiUrl}/CreateShipment`, payload, {
            headers: {
                'API-Key': config.apiKey,
                'Content-Type': 'application/json'
            }
        });

        return {
            trackingNumber: response.data.AWBNo,
            labelUrl: response.data.LabelURL,
            carrier: 'BLUE_DART'
        };
    }

    // Track shipment
    async trackShipment(carrier, trackingNumber) {
        try {
            const carrierConfig = this.carriers[carrier.toUpperCase()];
            if (!carrierConfig) {
                throw new Error(`Unsupported carrier: ${carrier}`);
            }

            let response;

            switch (carrier.toUpperCase()) {
                case 'DHL':
                    response = await axios.get(`${carrierConfig.apiUrl}/tracking/${trackingNumber}`, {
                        headers: { 'Authorization': `Bearer ${carrierConfig.apiKey}` }
                    });
                    break;
                case 'FEDEX':
                    response = await axios.post(`${carrierConfig.apiUrl}/track/v1/trackingnumbers`, {
                        trackingInfo: [{ trackingNumberInfo: { trackingNumber } }]
                    }, {
                        headers: { 'Authorization': `Bearer ${carrierConfig.apiKey}` }
                    });
                    break;
                case 'BLUE_DART':
                    response = await axios.get(`${carrierConfig.apiUrl}/TrackShipment/${trackingNumber}`, {
                        headers: { 'API-Key': carrierConfig.apiKey }
                    });
                    break;
            }

            return this.normalizeTrackingResponse(carrier, response.data);
        } catch (error) {
            console.error(`Tracking error for ${carrier}:`, error);
            throw error;
        }
    }

    // Normalize tracking response
    normalizeTrackingResponse(carrier, data) {
        // Normalize different carrier responses to a common format
        switch (carrier.toUpperCase()) {
            case 'DHL':
                return {
                    status: data.shipments?.[0]?.status?.status || 'UNKNOWN',
                    events: data.shipments?.[0]?.events || [],
                    estimatedDelivery: data.shipments?.[0]?.estimatedTimeOfDelivery
                };
            case 'FEDEX':
                return {
                    status: data.output?.completeTrackResults?.[0]?.trackResults?.[0]?.latestStatusDetail?.description || 'UNKNOWN',
                    events: data.output?.completeTrackResults?.[0]?.trackResults?.[0]?.scanEvents || [],
                    estimatedDelivery: data.output?.completeTrackResults?.[0]?.trackResults?.[0]?.estimatedDeliveryTimeWindow
                };
            case 'BLUE_DART':
                return {
                    status: data.Status || 'UNKNOWN',
                    events: data.Scans || [],
                    estimatedDelivery: data.EDD
                };
            default:
                return { status: 'UNKNOWN', events: [], estimatedDelivery: null };
        }
    }

    // Register webhook for tracking updates
    async registerWebhook(carrier, config, trackingNumber) {
        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/carriers`;

        switch (carrier.toUpperCase()) {
            case 'DHL':
                await axios.post(`${config.apiUrl}/webhooks`, {
                    url: webhookUrl,
                    events: ['SHIPMENT_STATUS_UPDATE'],
                    trackingNumber: trackingNumber
                }, {
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                break;

            case 'FEDEX':
                await axios.post(`${config.apiUrl}/webhooks/v1/register`, {
                    webhookUrl: webhookUrl,
                    events: ['TRACK'],
                    trackingNumber: trackingNumber
                }, {
                    headers: {
                        'Authorization': `Bearer ${config.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                break;

            case 'BLUE_DART':
                await axios.post(`${config.apiUrl}/RegisterWebhook`, {
                    WebhookUrl: webhookUrl,
                    Events: ['StatusUpdate'],
                    AWBNumber: trackingNumber
                }, {
                    headers: {
                        'API-Key': config.apiKey,
                        'Content-Type': 'application/json'
                    }
                });
                break;
        }
    }
}

export default new ShippingService();