import { sendEmail } from './email.js';
import prisma from './prisma.js';

export async function sendNotification(type, data) {
    try {
        const settings = await prisma.platformSettings.findFirst();
        if (!settings || !settings.emailNotificationsEnabled) {
            return false;
        }

        let specificEnabled = false;
        switch (type) {
            case 'newUser':
                specificEnabled = settings.newUserNotifications;
                break;
            case 'order':
                specificEnabled = settings.orderNotifications;
                break;
            case 'commission':
                specificEnabled = settings.commissionNotifications;
                break;
            case 'payout':
                specificEnabled = settings.payoutNotifications;
                break;
            case 'system':
                specificEnabled = settings.systemNotifications;
                break;
            case 'vendor':
                specificEnabled = true; // Always enabled for vendor notifications
                break;
            case 'support':
                specificEnabled = true; // Always enabled for support notifications
                break;
            default:
                return false;
        }

        if (!specificEnabled) {
            return false;
        }

        switch (type) {
            case 'newUser':
                return await sendNewUserNotification(data);
            case 'order':
                return await sendOrderNotification(data);
            case 'commission':
                return await sendCommissionNotification(data);
            case 'payout':
                return await sendPayoutNotification(data);
            case 'system':
                return await sendSystemNotification(data);
            case 'vendor':
                return await sendVendorNotification(data);
            case 'support':
                return await sendSupportNotification(data);
        }
    } catch (error) {
        console.error('Error in sendNotification:', error);
        return false;
    }
}

async function sendNewUserNotification(data) {
    const { email, name } = data;
    const settings = await prisma.platformSettings.findFirst();
    const siteName = settings?.siteName || 'DavCreations';

    const subject = `Welcome to ${siteName}!`;
    const text = `Hello ${name},\n\nWelcome to ${siteName}! Your account has been successfully created.\n\nThank you for joining us.\n\nBest regards,\n${siteName} Team`;
    const html = `<p>Hello ${name},</p><p>Welcome to ${siteName}! Your account has been successfully created.</p><p>Thank you for joining us.</p><p>Best regards,<br>${siteName} Team</p>`;

    try {
        await sendEmail({ to: email, subject, text, html });
        return true;
    } catch (error) {
        console.error('Error sending new user notification:', error);
        return false;
    }
}

async function sendOrderNotification(data) {
    const { email, orderId, total, currency = 'USD' } = data;
    const settings = await prisma.platformSettings.findFirst();
    const siteName = settings?.siteName || 'DavCreations';

    const subject = `Order Confirmation - Order #${orderId}`;
    const text = `Hello,\n\nYour order #${orderId} has been placed successfully.\n\nTotal: ${currency} ${total}\n\nThank you for shopping with us!\n\nBest regards,\n${siteName} Team`;
    const html = `<p>Hello,</p><p>Your order #${orderId} has been placed successfully.</p><p>Total: ${currency} ${total}</p><p>Thank you for shopping with us!</p><p>Best regards,<br>${siteName} Team</p>`;

    try {
        await sendEmail({ to: email, subject, text, html });
        return true;
    } catch (error) {
        console.error('Error sending order notification:', error);
        return false;
    }
}

async function sendCommissionNotification(data) {
    const { email, amount, currency = 'USD', storeName } = data;
    const settings = await prisma.platformSettings.findFirst();
    const siteName = settings?.siteName || 'DavCreations';

    const subject = `Commission Earned - ${storeName}`;
    const text = `Hello,\n\nYou have earned a commission of ${currency} ${amount} from ${storeName}.\n\nThis will be processed in your next payout.\n\nBest regards,\n${siteName} Team`;
    const html = `<p>Hello,</p><p>You have earned a commission of ${currency} ${amount} from ${storeName}.</p><p>This will be processed in your next payout.</p><p>Best regards,<br>${siteName} Team</p>`;

    try {
        await sendEmail({ to: email, subject, text, html });
        return true;
    } catch (error) {
        console.error('Error sending commission notification:', error);
        return false;
    }
}

async function sendPayoutNotification(data) {
    const { email, amount, currency = 'USD', status } = data;
    const settings = await prisma.platformSettings.findFirst();
    const siteName = settings?.siteName || 'DavCreations';

    const subject = `Payout ${status} - ${currency} ${amount}`;
    const text = `Hello,\n\nYour payout of ${currency} ${amount} has been ${status.toLowerCase()}.\n\nBest regards,\n${siteName} Team`;
    const html = `<p>Hello,</p><p>Your payout of ${currency} ${amount} has been ${status.toLowerCase()}.</p><p>Best regards,<br>${siteName} Team</p>`;

    try {
        await sendEmail({ to: email, subject, text, html });
        return true;
    } catch (error) {
        console.error('Error sending payout notification:', error);
        return false;
    }
}

async function sendSystemNotification(data) {
    const { email, subject, message } = data;
    const settings = await prisma.platformSettings.findFirst();
    const siteName = settings?.siteName || 'DavCreations';

    const fullSubject = `System Notification: ${subject}`;
    const text = `Hello,\n\n${message}\n\nBest regards,\n${siteName} Team`;
    const html = `<p>Hello,</p><p>${message.replace(/\n/g, '<br>')}</p><p>Best regards,<br>${siteName} Team</p>`;

    try {
        await sendEmail({ to: email, subject: fullSubject, text, html });
        return true;
    } catch (error) {
        console.error('Error sending system notification:', error);
        return false;
    }
}

async function sendVendorNotification(data) {
    const { email, type, storeName } = data; // type: 'onboarding_submitted', 'approved', 'rejected', 'issue'
    const settings = await prisma.platformSettings.findFirst();
    const siteName = settings?.siteName || 'DavCreations';

    let subject, message;
    switch (type) {
        case 'onboarding_submitted':
            subject = 'Onboarding Application Submitted';
            message = `Your vendor onboarding application for ${storeName} has been submitted successfully. We will review it and get back to you soon.`;
            break;
        case 'approved':
            subject = 'Vendor Application Approved';
            message = `Congratulations! Your vendor application for ${storeName} has been approved. You can now start selling on our platform.`;
            break;
        case 'rejected':
            subject = 'Vendor Application Rejected';
            message = `We regret to inform you that your vendor application for ${storeName} has been rejected. Please contact support for more details.`;
            break;
        case 'issue':
            subject = 'Issue with Your Vendor Application';
            message = `There is an issue with your vendor application for ${storeName}. Please check your profile and documents, and update as necessary.`;
            break;
        default:
            return false;
    }

    const text = `Hello,\n\n${message}\n\nBest regards,\n${siteName} Team`;
    const html = `<p>Hello,</p><p>${message.replace(/\n/g, '<br>')}</p><p>Best regards,<br>${siteName} Team</p>`;

    try {
        await sendEmail({ to: email, subject, text, html });
        return true;
    } catch (error) {
        console.error('Error sending vendor notification:', error);
        return false;
    }
}

async function sendSupportNotification(data) {
    const { email, ticketId, subject, message, replyFrom } = data;
    const settings = await prisma.platformSettings.findFirst();
    const siteName = settings?.siteName || 'DavCreations';

    const fullSubject = `Support Ticket Reply: ${subject}`;
    const text = `Hello,\n\nYou have received a reply to your support ticket #${ticketId}.\n\nFrom: ${replyFrom}\n\nMessage:\n${message}\n\nBest regards,\n${siteName} Team`;
    const html = `<p>Hello,</p><p>You have received a reply to your support ticket #${ticketId}.</p><p><strong>From:</strong> ${replyFrom}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p><p>Best regards,<br>${siteName} Team</p>`;

    try {
        await sendEmail({ to: email, subject: fullSubject, text, html });
        return true;
    } catch (error) {
        console.error('Error sending support notification:', error);
        return false;
    }
}