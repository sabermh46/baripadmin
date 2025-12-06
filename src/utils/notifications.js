import axios from 'axios';

class NotificationUtils {
  constructor() {
    this.baseURL = import.meta.env.VITE_APP_API_URL;
  }

  // Set auth token
  setToken(token) {
    this.token = token;
  }

  // Send notification to user
  async sendToUser(userId, title, body, data = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/push/send/user/${userId}`,
        { title, body, data },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
  }

  // Send notification to role
  async sendToRole(roleSlug, title, body, data = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/push/send/role/${roleSlug}`,
        { title, body, data },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending notification to role:', error);
      throw error;
    }
  }

  // Send notification to house stakeholders
  async sendToHouse(houseId, title, body, data = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/push/send/house/${houseId}`,
        { title, body, data },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending notification to house:', error);
      throw error;
    }
  }

  // Common notification templates
  templates = {
    rentDue: (houseName, flatNumber, amount, dueDate) => ({
      title: '💰 Rent Due',
      body: `Rent for ${flatNumber ? `Flat ${flatNumber}, ` : ''}${houseName} is due on ${dueDate}. Amount: ${amount}`,
      data: {
        type: 'rent_due',
        houseName,
        flatNumber,
        amount,
        dueDate,
        url: '/billing'
      }
    }),

    newNotice: (title, houseName) => ({
      title: '📢 New Notice',
      body: `New notice for ${houseName}: ${title}`,
      data: {
        type: 'new_notice',
        noticeTitle: title,
        houseName,
        url: '/notices'
      }
    }),

    maintenanceRequest: (houseName, flatNumber, issue) => ({
      title: '🔧 Maintenance Request',
      body: `Maintenance request from ${flatNumber ? `Flat ${flatNumber}, ` : ''}${houseName}: ${issue}`,
      data: {
        type: 'maintenance_request',
        houseName,
        flatNumber,
        issue,
        url: '/maintenance'
      }
    }),

    newRenter: (houseName, renterName) => ({
      title: '👤 New Renter Added',
      body: `New renter ${renterName} added to ${houseName}`,
      data: {
        type: 'new_renter',
        houseName,
        renterName,
        url: '/renters'
      }
    }),

    paymentReceived: (houseName, amount, payerName) => ({
      title: '✅ Payment Received',
      body: `Payment of ${amount} received from ${payerName} for ${houseName}`,
      data: {
        type: 'payment_received',
        houseName,
        amount,
        payerName,
        url: '/payments'
      }
    }),

    emergencyAlert: (houseName, message) => ({
      title: '🚨 Emergency Alert',
      body: `Emergency at ${houseName}: ${message}`,
      data: {
        type: 'emergency',
        houseName,
        message,
        url: '/emergency',
        priority: 'high'
      }
    })
  };

  // Send templated notification
  async sendTemplatedNotification(templateName, params, target) {
    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const { title, body, data } = template(...params);

    switch (target.type) {
      case 'user':
        return await this.sendToUser(target.userId, title, body, data);
      case 'role':
        return await this.sendToRole(target.roleSlug, title, body, data);
      case 'house':
        return await this.sendToHouse(target.houseId, title, body, data);
      default:
        throw new Error('Invalid target type');
    }
  }

  // Get user notification logs
  async getNotificationLogs(limit = 50, offset = 0) {
    try {
      const response = await axios.get(
        `${this.baseURL}/push/logs?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching notification logs:', error);
      throw error;
    }
  }
}

export default new NotificationUtils();