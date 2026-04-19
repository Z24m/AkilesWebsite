const API_BASE_URL = 'http://localhost:5000/api/v1';
const token = localStorage.getItem('akiles_token');

function apiFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            ...options.headers
        }
    });
}

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        if (link.classList.contains('logout')) return;
        
        e.preventDefault();
        const target = link.getAttribute('href').substring(1);
        
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        
        // Show selected section
        document.getElementById(target).classList.add('active');
        
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Load data
        if (target === 'dashboard') loadDashboard();
        if (target === 'customers') loadCustomers();
        if (target === 'shipments') loadShipments();
        if (target === 'bookings') loadBookings();
        if (target === 'users') loadUsers();
    });
});

// Load Dashboard
function loadDashboard() {
    apiFetch(`${API_BASE_URL}/admin/dashboard/stats`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('totalCustomers').textContent = data.data.totalCustomers || 0;
                document.getElementById('totalShipments').textContent = data.data.totalShipments || 0;
                document.getElementById('totalBookings').textContent = data.data.totalBookings || 0;
                document.getElementById('deliveredShipments').textContent = data.data.deliveredShipments || 0;
            }
        })
        .catch(err => console.error('Error loading stats:', err));

    apiFetch(`${API_BASE_URL}/admin/activity`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const list = document.getElementById('activityList');
                if (!list) return;

                list.innerHTML = data.data.map(item => 
                    `<li>${item.type}: ${item.title || item.name || 'N/A'} - ${new Date(item.createdAt).toLocaleDateString()}</li>`
                ).join('');
            }
        })
        .catch(err => console.error('Error loading activity:', err));

    apiFetch(`${API_BASE_URL}/admin/revenue`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const amount = data.data.totalRevenue || 0;
                document.getElementById('totalRevenue').textContent = `₱${parseFloat(amount).toFixed(2)}`;
            }
        })
        .catch(err => console.error('Error loading revenue:', err));
}

// Load Customers
function loadCustomers() {
    apiFetch(`${API_BASE_URL}/customers`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('customersBody');
                tbody.innerHTML = data.data.map(customer => `
                    <tr>
                        <td>${customer.id}</td>
                        <td>${customer.name}</td>
                        <td>${customer.email}</td>
                        <td>${customer.phone || 'N/A'}</td>
                        <td>${customer.company || 'N/A'}</td>
                        <td>
                            <button class="btn btn-edit" onclick="editCustomer(${customer.id})">Edit</button>
                            <button class="btn btn-danger" onclick="deleteCustomer(${customer.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        })
        .catch(err => console.error('Error loading customers:', err));
}

// Load Shipments
function loadShipments() {
    apiFetch(`${API_BASE_URL}/shipments`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('shipmentsBody');
                tbody.innerHTML = data.data.map(shipment => `
                    <tr>
                        <td>${shipment.id}</td>
                        <td>${shipment.trackingNumber}</td>
                        <td>${shipment.origin}</td>
                        <td>${shipment.destination}</td>
                        <td><span class="badge badge-${shipment.status}">${shipment.status}</span></td>
                        <td>${shipment.weight || 'N/A'}</td>
                        <td>
                            <button class="btn btn-edit" onclick="openShipmentFormById(${shipment.id})">Edit</button>
                            <button class="btn btn-danger" onclick="deleteShipment(${shipment.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        })
        .catch(err => console.error('Error loading shipments:', err));
}

// Load Bookings
function loadBookings() {
    apiFetch(`${API_BASE_URL}/bookings`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('bookingsBody');
                tbody.innerHTML = data.data.map(booking => `
                    <tr>
                        <td>${booking.id}</td>
                        <td>${booking.customerId}</td>
                        <td>${booking.pickupLocation}</td>
                        <td>${booking.deliveryLocation}</td>
                        <td>${booking.serviceType}</td>
                        <td><span class="badge badge-${booking.status}">${booking.status}</span></td>
                        <td>
                            <button class="btn btn-edit" onclick="editBooking(${booking.id})">Edit</button>
                            <button class="btn btn-danger" onclick="deleteBooking(${booking.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        })
        .catch(err => console.error('Error loading bookings:', err));
}

function openBookingForm(booking = null) {
    document.getElementById('bookingModal').classList.add('active');
    document.getElementById('bookingForm').reset();

    if (booking) {
        document.getElementById('bookingId').value = booking.id;
        document.getElementById('bookingCustomerId').value = booking.customerId;
        document.getElementById('bookingPickupLocation').value = booking.pickupLocation;
        document.getElementById('bookingDeliveryLocation').value = booking.deliveryLocation;
        document.getElementById('bookingServiceType').value = booking.serviceType;
        document.getElementById('bookingStatus').value = booking.status;
    } else {
        document.getElementById('bookingId').value = '';
    }
}

function closeBookingForm() {
    document.getElementById('bookingModal').classList.remove('active');
}

function submitBookingForm(e) {
    e.preventDefault();

    const bookingId = document.getElementById('bookingId').value;
    const data = {
        customerId: Number(document.getElementById('bookingCustomerId').value),
        pickupLocation: document.getElementById('bookingPickupLocation').value,
        deliveryLocation: document.getElementById('bookingDeliveryLocation').value,
        serviceType: document.getElementById('bookingServiceType').value,
        status: document.getElementById('bookingStatus').value
    };

    const method = bookingId ? 'PUT' : 'POST';
    const url = bookingId ? `${API_BASE_URL}/bookings/${bookingId}` : `${API_BASE_URL}/bookings`;

    apiFetch(url, {
        method,
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            alert('Booking saved successfully');
            closeBookingForm();
            loadBookings();
        } else {
            alert('Error: ' + (response.error || 'Unexpected error'));
        }
    })
    .catch(err => alert('Error: ' + err.message));
}

function editBooking(bookingId) {
    fetch(`${API_BASE_URL}/bookings/${bookingId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data) {
                openBookingForm(data.data);
            } else {
                alert('Could not load booking');
            }
        })
        .catch(err => alert('Error: ' + err.message));
}

function deleteBooking(bookingId) {
    if (!confirm('Delete this booking?')) return;

    apiFetch(`${API_BASE_URL}/bookings/${bookingId}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Booking deleted');
                loadBookings();
            } else {
                alert('Error: ' + (data.error || 'Could not delete booking'));
            }
        })
        .catch(err => alert('Error: ' + err.message));
}

// Load Users
function loadUsers() {
    apiFetch(`${API_BASE_URL}/admin/users`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('usersBody');
                tbody.innerHTML = data.data.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-edit" onclick="openUserFormById(${user.id})">Edit</button>
                            <button class="btn btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        })
        .catch(err => console.error('Error loading users:', err));
}

// Customer Form
function openCustomerForm() {
    document.getElementById('customerModal').classList.add('active');
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
}

function closeCustomerForm() {
    document.getElementById('customerModal').classList.remove('active');
}

function submitCustomerForm(e) {
    e.preventDefault();
    
    const customerId = document.getElementById('customerId').value;
    const data = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        company: document.getElementById('customerCompany').value
    };

    const method = customerId ? 'PUT' : 'POST';
    const url = customerId ? `${API_BASE_URL}/customers/${customerId}` : `${API_BASE_URL}/customers`;

    apiFetch(url, {
        method,
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Customer saved successfully');
            closeCustomerForm();
            loadCustomers();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => alert('Error: ' + err.message));
}

// Shipment Form
function openShipmentForm(shipment = null) {
    document.getElementById('shipmentModal').classList.add('active');
    document.getElementById('shipmentForm').reset();

    if (shipment) {
        document.getElementById('shipmentId').value = shipment.id;
        document.getElementById('shipmentCustomerId').value = shipment.customerId;
        document.getElementById('shipmentTrackingNumber').value = shipment.trackingNumber;
        document.getElementById('shipmentOrigin').value = shipment.origin;
        document.getElementById('shipmentDestination').value = shipment.destination;
        document.getElementById('shipmentStatus').value = shipment.status;
        document.getElementById('shipmentWeight').value = shipment.weight || '';
        document.getElementById('shipmentEstimatedDelivery').value = shipment.estimatedDelivery ? shipment.estimatedDelivery.split('T')[0] : '';
    } else {
        document.getElementById('shipmentId').value = '';
    }
}

function closeShipmentForm() {
    document.getElementById('shipmentModal').classList.remove('active');
}

function submitShipmentForm(e) {
    e.preventDefault();

    const shipmentId = document.getElementById('shipmentId').value;
    const payload = {
        customerId: Number(document.getElementById('shipmentCustomerId').value),
        trackingNumber: document.getElementById('shipmentTrackingNumber').value,
        origin: document.getElementById('shipmentOrigin').value,
        destination: document.getElementById('shipmentDestination').value,
        status: document.getElementById('shipmentStatus').value,
        weight: parseFloat(document.getElementById('shipmentWeight').value) || null,
        estimatedDelivery: document.getElementById('shipmentEstimatedDelivery').value || null
    };

    const method = shipmentId ? 'PUT' : 'POST';
    const url = shipmentId ? `${API_BASE_URL}/shipments/${shipmentId}` : `${API_BASE_URL}/shipments`;

    apiFetch(url, {
        method,
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Shipment saved successfully');
            closeShipmentForm();
            loadShipments();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => alert('Error: ' + err.message));
}

function openShipmentFormById(shipmentId) {
    apiFetch(`${API_BASE_URL}/shipments/${shipmentId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data) {
                openShipmentForm(data.data);
            } else {
                alert('Could not load shipment data');
            }
        })
        .catch(err => alert('Error: ' + err.message));
}

function deleteShipment(shipmentId) {
    if (!confirm('Are you sure you want to delete this shipment?')) return;

    apiFetch(`${API_BASE_URL}/shipments/${shipmentId}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Shipment deleted successfully');
            loadShipments();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => alert('Error: ' + err.message));
}

// User modal + form
function openUserForm(user = null) {
    document.getElementById('userModal').classList.add('active');
    document.getElementById('userForm').reset();

    if (user) {
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userPassword').value = '';
    } else {
        document.getElementById('userId').value = '';
        document.getElementById('userPassword').value = '';
    }
}

function closeUserForm() {
    document.getElementById('userModal').classList.remove('active');
}

function submitUserForm(e) {
    e.preventDefault();

    const userId = document.getElementById('userId').value;
    const payload = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        role: document.getElementById('userRole').value
    };

    // If password is present, include it (only on create or manual edit)
    const password = document.getElementById('userPassword').value;
    if (password) payload.password = password;

    const method = userId ? 'PUT' : 'POST';
    const url = userId ? `${API_BASE_URL}/admin/users/${userId}` : `${API_BASE_URL}/auth/register`;

    apiFetch(url, {
        method,
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('User saved successfully');
            closeUserForm();
            loadUsers();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => alert('Error: ' + err.message));
}

function openUserFormById(userId) {
    apiFetch(`${API_BASE_URL}/admin/users/${userId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data) {
                openUserForm(data.data);
            } else {
                alert('Could not load user data');
            }
        })
        .catch(err => alert('Error: ' + err.message));
}

function deleteUser(userId) {
    if (!confirm('This will delete the user. Continue?')) return;

    apiFetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('User deleted successfully');
            loadUsers();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => alert('Error: ' + err.message));
}