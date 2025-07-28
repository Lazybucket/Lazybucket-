
// Order Management System
class OrderManager {
    constructor() {
        this.customers = JSON.parse(localStorage.getItem('customers')) || [];
        this.orders = JSON.parse(localStorage.getItem('orders')) || [];
        this.currentCustomerId = null;
        this.currentOrderId = null;
        
        this.webhookUrl = 'https://discord.com/api/webhooks/1399052921072648212/UgW704vYe9NEQA02hRpDN8Gxbiqo-WLFWBFkf2E5W4VBdRv8w9oRvuNELta5IqyQJQH_';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderCustomers();
    }

    bindEvents() {
        // Main view events
        document.getElementById('add-customer-btn').addEventListener('click', () => this.showCustomerModal());
        document.getElementById('summary-btn').addEventListener('click', () => this.showSummary());

        // Customer modal events
        document.getElementById('confirm-add-customer').addEventListener('click', () => this.addCustomer());
        document.getElementById('cancel-add-customer').addEventListener('click', () => this.hideCustomerModal());
        document.getElementById('customer-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCustomer();
        });

        // Customer view events
        document.getElementById('back-btn').addEventListener('click', () => this.showMainView());
        document.getElementById('add-order-btn').addEventListener('click', () => this.addOrder());

        // Order modal events
        document.getElementById('confirm-edit-order').addEventListener('click', () => this.updateOrder());
        document.getElementById('cancel-edit-order').addEventListener('click', () => this.hideOrderModal());

        // Summary modal events
        document.getElementById('confirm-summary').addEventListener('click', () => this.confirmSummary());
    }

    // Customer Management
    addCustomer() {
        const name = document.getElementById('customer-name-input').value.trim();
        if (!name) return;

        const customer = {
            id: Date.now(),
            name: name,
            createdAt: new Date().toISOString()
        };

        this.customers.push(customer);
        this.saveData();
        this.renderCustomers();
        this.hideCustomerModal();
        document.getElementById('customer-name-input').value = '';
    }

    deleteCustomer(customerId) {
        if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
            this.customers = this.customers.filter(c => c.id !== customerId);
            this.orders = this.orders.filter(o => o.customerId !== customerId);
            this.saveData();
            this.renderCustomers();
        }
    }

    showCustomer(customerId) {
        this.currentCustomerId = customerId;
        const customer = this.customers.find(c => c.id === customerId);
        
        document.getElementById('customer-name').textContent = customer.name;
        document.getElementById('main-view').classList.add('hidden');
        document.getElementById('customer-view').classList.remove('hidden');
        
        this.renderOrders();
    }

    showMainView() {
        document.getElementById('customer-view').classList.add('hidden');
        document.getElementById('main-view').classList.remove('hidden');
        this.currentCustomerId = null;
    }

    // Order Management
    addOrder() {
        const productName = document.getElementById('product-name').value.trim();
        const quantity = parseInt(document.getElementById('quantity').value);
        const unitPrice = parseFloat(document.getElementById('unit-price').value);

        if (!productName || !quantity || !unitPrice) {
            alert('Vui lòng điền đầy đủ thông tin!');
            return;
        }

        const order = {
            id: Date.now(),
            customerId: this.currentCustomerId,
            productName: productName,
            quantity: quantity,
            unitPrice: unitPrice,
            totalAmount: quantity * unitPrice,
            paidAmount: 0,
            remainingAmount: quantity * unitPrice,
            paymentStatus: 'chưa thanh toán',
            deliveryStatus: 'chưa giao',
            createdAt: new Date().toISOString()
        };

        this.orders.push(order);
        this.saveData();
        this.renderOrders();
        this.clearOrderForm();
        
        // Send Discord notification
        this.sendOrderNotification(order, 'create');
    }

    editOrder(orderId) {
        this.currentOrderId = orderId;
        const order = this.orders.find(o => o.id === orderId);
        
        document.getElementById('paid-amount').value = order.paidAmount || 0;
        document.getElementById('delivery-status').value = order.deliveryStatus;
        
        this.showOrderModal();
    }

    updateOrder() {
        const paidAmount = parseFloat(document.getElementById('paid-amount').value) || 0;
        const deliveryStatus = document.getElementById('delivery-status').value;
        
        const order = this.orders.find(o => o.id === this.currentOrderId);
        order.paidAmount = paidAmount;
        order.remainingAmount = Math.max(0, order.totalAmount - paidAmount);
        order.paymentStatus = paidAmount >= order.totalAmount ? 'đã thanh toán' : 'chưa thanh toán';
        order.deliveryStatus = deliveryStatus;
        order.updatedAt = new Date().toISOString();

        this.saveData();
        this.renderOrders();
        this.hideOrderModal();
        
        // Send Discord notification
        this.sendOrderNotification(order, 'update');
    }

    deleteOrder(orderId) {
        if (confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
            this.orders = this.orders.filter(o => o.id !== orderId);
            this.saveData();
            this.renderOrders();
        }
    }

    // UI Rendering
    renderCustomers() {
        const container = document.getElementById('customers-list');
        container.innerHTML = '';

        this.customers.forEach((customer, index) => {
            const customerOrders = this.orders.filter(o => o.customerId === customer.id);
            const totalOrders = customerOrders.length;
            const totalAmount = customerOrders.reduce((sum, o) => sum + o.totalAmount, 0);

            const card = document.createElement('div');
            card.className = 'customer-card flex items-center justify-between';
            card.innerHTML = `
                <div class="flex items-center space-x-4">
                    <div class="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                        ${index + 1}
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
                            onclick="orderManager.showCustomer(${customer.id})">
                            ${customer.name}
                        </h3>
                        <p class="text-sm text-gray-600">
                            ${totalOrders} đơn hàng • ${this.formatCurrency(totalAmount)}
                        </p>
                    </div>
                </div>
                <button onclick="orderManager.deleteCustomer(${customer.id})" 
                        class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">
                    Xóa
                </button>
            `;
            container.appendChild(card);
        });
    }

    renderOrders() {
        const container = document.getElementById('orders-list');
        container.innerHTML = '';

        const customerOrders = this.orders.filter(o => o.customerId === this.currentCustomerId);

        if (customerOrders.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-8">Chưa có đơn hàng nào</p>';
            return;
        }

        customerOrders.forEach(order => {
            const card = document.createElement('div');
            card.className = `order-card ${order.paymentStatus === 'đã thanh toán' ? 'paid' : ''} ${order.deliveryStatus === 'đã giao' ? 'delivered' : ''}`;
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="text-lg font-semibold text-gray-800">${order.productName}</h4>
                        <p class="text-sm text-gray-600">Số lượng: ${order.quantity} • Đơn giá: ${this.formatCurrency(order.unitPrice)}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="orderManager.editOrder(${order.id})" 
                                class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                            Sửa
                        </button>
                        <button onclick="orderManager.deleteOrder(${order.id})" 
                                class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">
                            Xóa
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span class="text-gray-600">Tổng tiền:</span>
                        <p class="font-semibold">${this.formatCurrency(order.totalAmount)}</p>
                    </div>
                    <div>
                        <span class="text-gray-600">Đã trả:</span>
                        <p class="font-semibold">${this.formatCurrency(order.paidAmount)}</p>
                    </div>
                    <div>
                        <span class="text-gray-600">Còn lại:</span>
                        <p class="font-semibold text-red-600">${this.formatCurrency(order.remainingAmount)}</p>
                    </div>
                    <div>
                        <span class="text-gray-600">Trạng thái:</span>
                        <div class="mt-1">
                            <span class="status-badge ${order.paymentStatus === 'đã thanh toán' ? 'status-paid' : 'status-unpaid'}">
                                ${order.paymentStatus}
                            </span>
                            <span class="status-badge ${order.deliveryStatus === 'đã giao' ? 'status-delivered' : 'status-not-delivered'} ml-1">
                                ${order.deliveryStatus}
                            </span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Modal Management
    showCustomerModal() {
        document.getElementById('customer-modal').classList.remove('hidden');
        document.getElementById('customer-name-input').focus();
    }

    hideCustomerModal() {
        document.getElementById('customer-modal').classList.add('hidden');
    }

    showOrderModal() {
        document.getElementById('order-modal').classList.remove('hidden');
    }

    hideOrderModal() {
        document.getElementById('order-modal').classList.add('hidden');
    }

    // Summary and Statistics
    showSummary() {
        // Confirm before showing summary
        if (!confirm('Bạn có chắc chắn muốn thực hiện tổng kết?\n\nLưu ý: Sau khi tổng kết, tất cả đơn hàng sẽ bị xóa và không thể khôi phục!')) {
            return;
        }

        const totalCustomers = this.customers.length;
        const totalOrders = this.orders.length;
        const totalRevenue = this.orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalPaid = this.orders.reduce((sum, order) => sum + order.paidAmount, 0);

        document.getElementById('summary-content').innerHTML = `
            <div class="space-y-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-blue-800">Tổng số khách hàng</h3>
                    <p class="text-3xl font-bold text-blue-600">${totalCustomers}</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-green-800">Tổng số đơn hàng</h3>
                    <p class="text-3xl font-bold text-green-600">${totalOrders}</p>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-purple-800">Tổng doanh thu</h3>
                    <p class="text-3xl font-bold text-purple-600">${this.formatCurrency(totalRevenue)}</p>
                </div>
                <div class="bg-orange-50 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-orange-800">Đã thu được</h3>
                    <p class="text-3xl font-bold text-orange-600">${this.formatCurrency(totalPaid)}</p>
                </div>
            </div>
        `;

        document.getElementById('summary-modal').classList.remove('hidden');
    }

    confirmSummary() {
        // Send summary to Discord BEFORE clearing orders
        this.sendSummaryNotification();
        
        // Clear all orders but keep customers
        this.orders = [];
        this.saveData();
        
        document.getElementById('summary-modal').classList.add('hidden');
        
        // Refresh views
        if (this.currentCustomerId) {
            this.renderOrders();
        } else {
            this.renderCustomers();
        }
        
        alert('Đã tổng kết và xóa tất cả đơn hàng!');
    }

    // Discord Integration
    async sendOrderNotification(order, action) {
        const customer = this.customers.find(c => c.id === order.customerId);
        const actionText = action === 'create' ? 'Tạo đơn hàng mới' : 'Cập nhật đơn hàng';
        
        const embed = {
            title: actionText,
            color: action === 'create' ? 0x00ff00 : 0xffaa00,
            fields: [
                { name: 'Khách hàng', value: customer.name, inline: true },
                { name: 'Sản phẩm', value: order.productName, inline: true },
                { name: 'Số lượng', value: order.quantity.toString(), inline: true },
                { name: 'Tổng tiền', value: this.formatCurrency(order.totalAmount), inline: true },
                { name: 'Đã trả', value: this.formatCurrency(order.paidAmount), inline: true },
                { name: 'Còn lại', value: this.formatCurrency(order.remainingAmount), inline: true },
                { name: 'Thanh toán', value: order.paymentStatus, inline: true },
                { name: 'Giao hàng', value: order.deliveryStatus, inline: true }
            ],
            timestamp: new Date().toISOString()
        };

        await this.sendToDiscord({ embeds: [embed] });
    }

    async sendSummaryNotification() {
        const totalCustomers = this.customers.length;
        const totalOrders = this.orders.length;
        const totalRevenue = this.orders.reduce((sum, order) => sum + order.totalAmount, 0);

        const embed = {
            title: '🎉 TỔNG KẾT CUỐI NGÀY 🎉',
            color: 0xff6b6b,
            fields: [
                { name: 'Tổng số khách hàng', value: totalCustomers.toString(), inline: true },
                { name: 'Tổng số đơn hàng', value: totalOrders.toString(), inline: true },
                { name: 'Tổng doanh thu', value: this.formatCurrency(totalRevenue), inline: true }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Hệ thống quản lý đơn hàng' }
        };

        await this.sendToDiscord({ 
            content: '@everyone Báo cáo tổng kết!',
            embeds: [embed] 
        });
    }

    async sendToDiscord(payload) {
        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Error sending to Discord:', error);
        }
    }

    // Utility Functions
    clearOrderForm() {
        document.getElementById('product-name').value = '';
        document.getElementById('quantity').value = '';
        document.getElementById('unit-price').value = '';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    saveData() {
        localStorage.setItem('customers', JSON.stringify(this.customers));
        localStorage.setItem('orders', JSON.stringify(this.orders));
    }
}

// Initialize the application
const orderManager = new OrderManager();
