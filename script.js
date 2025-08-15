// Global variables
let itemCounter = 0;
let serviceItems = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    addServiceItem(); // Add first item by default
});

// Initialize form with default values
function initializeForm() {
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Set due date to 30 days from today
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById('dueDate').value = dueDate.toISOString().split('T')[0];
    
    // Generate unique invoice number
    const invoiceNumber = 'INV-' + Date.now().toString().slice(-6);
    document.getElementById('invoiceNumber').value = invoiceNumber;
}

// Add a new service item
function addServiceItem() {
    itemCounter++;
    const itemsContainer = document.getElementById('itemsContainer');
    
    const serviceItem = document.createElement('div');
    serviceItem.className = 'service-item';
    serviceItem.setAttribute('data-item-id', itemCounter);
    
    serviceItem.innerHTML = `
        <div class="item-header">
            <span class="item-number">Item ${itemCounter}</span>
            <button type="button" class="remove-item" onclick="removeServiceItem(${itemCounter})">Remove</button>
        </div>
        <div class="item-row">
            <div class="form-group">
                <label>Description</label>
                <input type="text" class="item-description" placeholder="e.g., Video Production, Editing, Photography" onchange="calculateTotals()">
            </div>
            <div class="form-group">
                <label>Price (PKR)</label>
                <input type="number" class="item-price" step="0.01" min="0" placeholder="0.00" onchange="calculateItemTotal(${itemCounter}); calculateTotals()">
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" class="item-quantity" min="1" value="1" onchange="calculateItemTotal(${itemCounter}); calculateTotals()">
            </div>
            <div class="form-group">
                <label>Discount (%)</label>
                <input type="number" class="item-discount" step="0.01" min="0" max="100" value="0" onchange="calculateItemTotal(${itemCounter}); calculateTotals()">
            </div>
        </div>
        <div class="item-total">
            Item Total: <span class="item-total-amount" id="itemTotal${itemCounter}">PKR 0.00</span>
        </div>
    `;
    
    itemsContainer.appendChild(serviceItem);
    
    // Add to service items array
    serviceItems.push({
        id: itemCounter,
        description: '',
        price: 0,
        quantity: 1,
        discount: 0,
        total: 0
    });
    
    calculateTotals();
}

// Remove a service item
function removeServiceItem(itemId) {
    const serviceItem = document.querySelector(`[data-item-id="${itemId}"]`);
    if (serviceItem) {
        serviceItem.remove();
        
        // Remove from array
        serviceItems = serviceItems.filter(item => item.id !== itemId);
        
        // Renumber remaining items
        renumberItems();
        calculateTotals();
    }
}

// Renumber items after removal
function renumberItems() {
    const items = document.querySelectorAll('.service-item');
    items.forEach((item, index) => {
        const itemNumber = item.querySelector('.item-number');
        itemNumber.textContent = `Item ${index + 1}`;
    });
}

// Calculate individual item total
function calculateItemTotal(itemId) {
    const serviceItem = document.querySelector(`[data-item-id="${itemId}"]`);
    if (!serviceItem) return;
    
    const price = parseFloat(serviceItem.querySelector('.item-price').value) || 0;
    const quantity = parseFloat(serviceItem.querySelector('.item-quantity').value) || 1;
    const discount = parseFloat(serviceItem.querySelector('.item-discount').value) || 0;
    
    const subtotal = price * quantity;
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;
    
    // Update the item total display
    const totalElement = serviceItem.querySelector('.item-total-amount');
    totalElement.textContent = `PKR ${total.toFixed(2)}`;
    
    // Update the service items array
    const itemIndex = serviceItems.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
        serviceItems[itemIndex] = {
            id: itemId,
            description: serviceItem.querySelector('.item-description').value,
            price: price,
            quantity: quantity,
            discount: discount,
            total: total
        };
    }
}

// Calculate overall totals
function calculateTotals() {
    let subtotal = 0;
    let totalDiscount = 0;
    
    // Update service items data and calculate totals
    const items = document.querySelectorAll('.service-item');
    items.forEach((item, index) => {
        const itemId = parseInt(item.getAttribute('data-item-id'));
        calculateItemTotal(itemId);
        
        const itemData = serviceItems.find(si => si.id === itemId);
        if (itemData) {
            const itemSubtotal = itemData.price * itemData.quantity;
            const itemDiscountAmount = itemSubtotal * (itemData.discount / 100);
            
            subtotal += itemSubtotal;
            totalDiscount += itemDiscountAmount;
        }
    });
    
    const totalAmount = subtotal - totalDiscount;
    
    // Update display
    document.getElementById('subtotal').textContent = `PKR ${subtotal.toFixed(2)}`;
    document.getElementById('totalDiscount').textContent = `PKR ${totalDiscount.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `PKR ${totalAmount.toFixed(2)}`;
}

// Generate PDF invoice
function generatePDF() {
    // Validate required fields
    if (!validateForm()) {
        return;
    }
    
    // Show loading state
    const generateBtn = document.querySelector('.btn-primary');
    const originalText = generateBtn.textContent;
    generateBtn.textContent = 'Generating PDF...';
    generateBtn.disabled = true;
    
    try {
        // Get form data
        const invoiceData = getFormData();
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        
        // Add premium header background
        doc.setFillColor(248, 250, 252); // Light blue-gray background
        doc.rect(0, 0, 210, 55, 'F');
        
        // Add accent line
        doc.setFillColor(111, 115, 120); // Gray accent
        doc.rect(0, 0, 210, 3, 'F');
        
        // Load and add logo with better sizing
        const logoImg = document.querySelector('.company-logo');
        if (logoImg && logoImg.complete) {
            try {
                // Better positioned logo
                doc.addImage(logoImg.src, 'PNG', 20, 12, 20, 20);
            } catch (error) {
                console.warn('Could not add logo to PDF:', error);
            }
        }
        
        // Enhanced company header with better typography
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(26, 32, 44); // Dark gray
        doc.text('Proton Studio', 45, 22);
        
        // Company tagline
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(113, 128, 150); // Medium gray
        doc.text('Professional Film & Media Services', 45, 28);
        
        // Company address with improved formatting
        doc.setFontSize(8);
        doc.setTextColor(113, 128, 150);
        doc.text('1401 Bahria Orchard, Lahore, Punjab 54000', 45, 34);
        doc.text('Email: info@protonstudio.com | Phone: +92 300 1234567', 45, 39);
        
        // Enhanced Invoice Title Section with better positioning
        const invoiceBoxWidth = 50;
        const invoiceBoxX = 155;
        
        // Enhanced invoice title section with background
        doc.setFillColor(111, 115, 120); // Gray background
        doc.rect(invoiceBoxX, 12, invoiceBoxWidth, 30, 'F');
        
        // Invoice title with white text on blue background
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255); // White text
        doc.text('INVOICE', invoiceBoxX + (invoiceBoxWidth/2), 20, { align: 'center' });
        
        // Invoice number with styling
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`#${invoiceData.invoiceNumber}`, invoiceBoxX + (invoiceBoxWidth/2), 27, { align: 'center' });
        
        // Due date badge
        doc.setFontSize(7);
        doc.text(`Due: ${formatDate(invoiceData.dueDate)}`, invoiceBoxX + (invoiceBoxWidth/2), 37, { align: 'center' });
        
        // Reset color for rest of document
        doc.setTextColor(0, 0, 0);
        
        // Enhanced Bill To and Invoice Date sections with better alignment
        const billToSectionY = 60;
        const invoiceDateX = 155;
        
        // Bill To section
        doc.setFillColor(248, 250, 252);
        doc.rect(20, billToSectionY, 70, 4, 'F');
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(111, 115, 120);
        doc.text('BILL TO', 22, billToSectionY + 3);
        
        // Invoice Date section - properly aligned to the right
        doc.setFillColor(248, 250, 252);
        doc.rect(invoiceDateX, billToSectionY, 50, 4, 'F');
        
        doc.setTextColor(111, 115, 120);
        doc.text('INVOICE DATE', invoiceDateX + 2, billToSectionY + 3);
        
        // Client information with better formatting
        doc.setFont(undefined, 'bold');
        doc.setTextColor(26, 32, 44);
        doc.setFontSize(11);
        let yPos = 72;
        if (invoiceData.clientName) {
            doc.text(invoiceData.clientName, 20, yPos);
            yPos += 7;
        }
        
        // Date information - properly aligned to the right
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(45, 55, 72);
        doc.text(formatDate(invoiceData.invoiceDate), invoiceDateX + 2, 72);
        
        // Client details with consistent spacing
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(113, 128, 150);
        if (invoiceData.clientEmail) {
            doc.text(`Email: ${invoiceData.clientEmail}`, 20, yPos);
            yPos += 5;
        }
        if (invoiceData.clientCompany) {
            doc.text(`Company: ${invoiceData.clientCompany}`, 20, yPos);
            yPos += 5;
        }
        if (invoiceData.clientPhone) {
            doc.text(`Phone: ${invoiceData.clientPhone}`, 20, yPos);
            yPos += 5;
        }
        if (invoiceData.clientAddress) {
            doc.text('Address:', 20, yPos);
            yPos += 5;
            const addressLines = invoiceData.clientAddress.split('\n');
            addressLines.forEach(line => {
                if (line.trim()) {
                    doc.text(`   ${line.trim()}`, 20, yPos);
                    yPos += 5;
                }
            });
        }
        
        // Services table (with proper margins and spacing)
        const tableStartY = Math.max(yPos + 15, 115);
        
        const tableColumns = ['DESCRIPTION', 'QTY', 'PRICE', 'OFF %', 'TOTAL'];
        const tableRows = [];
        
        serviceItems.forEach(item => {
            if (item.description) {
                const subtotal = item.price * item.quantity;
                const discountAmount = subtotal * (item.discount / 100);
                const total = subtotal - discountAmount;
                
                tableRows.push([
                    item.description,
                    item.quantity.toString(),
                    `PKR ${item.price.toFixed(2)}`,
                    `PKR ${discountAmount.toFixed(2)}`,
                    `PKR ${total.toFixed(2)}`
                ]);
            }
        });
        
        doc.autoTable({
            head: [tableColumns],
            body: tableRows,
            startY: tableStartY,
            margin: { left: 20, right: 20 },
            theme: 'grid',
            headStyles: {
                fillColor: [111, 115, 120], // Gray header
                textColor: [255, 255, 255], // White text
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
                lineColor: [111, 115, 120],
                lineWidth: 0
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
                textColor: [45, 55, 72],
                fontSize: 8,
                cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
                lineColor: [226, 232, 240],
                lineWidth: 0.5
            },
            styles: {
                lineColor: [226, 232, 240],
                lineWidth: 0.5,
                cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
                font: 'helvetica'
            },
            columnStyles: {
                0: { cellWidth: 85, fontStyle: 'normal', halign: 'left' }, // Description - left aligned, wider
                1: { cellWidth: 20, halign: 'center' }, // Quantity - center aligned
                2: { cellWidth: 25, halign: 'right' }, // Price - right aligned
                3: { cellWidth: 25, halign: 'right', textColor: [245, 101, 101] }, // Discount - right aligned, red
                4: { cellWidth: 25, halign: 'right', fontStyle: 'bold', textColor: [111, 115, 120] } // Total - right aligned, gray, bold
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Very light blue-gray
            }
        });
        
        // Enhanced totals section with better positioning
        const finalY = doc.lastAutoTable.finalY + 15;
        const totalsBoxWidth = 65; // Increased width for better fit
        const totalsBoxX = 140; // Adjusted position
        const totalsBoxY = finalY;
        
        // Add subtle background for totals section
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(totalsBoxX - 3, totalsBoxY - 3, totalsBoxWidth, 35, 2, 2, 'F');
        
        // Add border
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.roundedRect(totalsBoxX - 3, totalsBoxY - 3, totalsBoxWidth, 35, 2, 2, 'S');
        
        const totalsLabelX = totalsBoxX;
        const totalsValueX = totalsBoxX + totalsBoxWidth - 5;
        
        const subtotal = serviceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalDiscount = serviceItems.reduce((sum, item) => {
            const itemSubtotal = item.price * item.quantity;
            return sum + (itemSubtotal * (item.discount / 100));
        }, 0);
        const totalAmount = subtotal - totalDiscount;
        
        // Subtotal
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(113, 128, 150);
        doc.text('Subtotal', totalsLabelX, finalY + 3);
        doc.setTextColor(45, 55, 72);
        doc.text(`PKR ${subtotal.toFixed(2)}`, totalsValueX, finalY + 3, { align: 'right' });
        
        // Discount
        doc.setTextColor(113, 128, 150);
        doc.text('Discount', totalsLabelX, finalY + 10);
        doc.setTextColor(245, 101, 101); // Red for discount
        doc.text(`-PKR ${totalDiscount.toFixed(2)}`, totalsValueX, finalY + 10, { align: 'right' });
        
        // Amount Due - highlighted section with proper spacing
        doc.setFillColor(111, 115, 120);
        doc.roundedRect(totalsLabelX - 2, finalY + 15, totalsBoxWidth-2, 12, 2, 2, 'F');
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255); // White text on gray background
        doc.text('AMOUNT DUE', totalsLabelX + 1, finalY + 22);
        doc.text(`PKR ${totalAmount.toFixed(2)}`, totalsValueX - 3, finalY + 22, { align: 'right' });
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        
        // Enhanced payment instructions with professional styling - aligned with totals box
        if (invoiceData.paymentInstructions) {
            const pageHeight = doc.internal.pageSize.height;
            const instructionsStartY = finalY + 49; // Increased spacing between totals and payment instructions
            const instructionsX = totalsBoxX - 3; // Align with totals box left edge
            const instructionsWidth = totalsBoxWidth + 45; // Wider than totals box
            
            // Check if we need a new page for payment instructions
            if (instructionsStartY > pageHeight - 80) {
                doc.addPage();
                const newInstructionsY = 40;
                
                // Add header background for new page - aligned with totals
                doc.setFillColor(248, 250, 252);
                doc.rect(instructionsX, newInstructionsY - 15, instructionsWidth, 8, 'F');
                
                doc.setFont(undefined, 'bold');
                doc.setFontSize(12);
                doc.setTextColor(111, 115, 120);
                doc.text('PAYMENT INSTRUCTIONS', instructionsX + 3, newInstructionsY - 9);
                
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                doc.setTextColor(45, 55, 72);
                
                const instructions = doc.splitTextToSize(invoiceData.paymentInstructions, instructionsWidth - 6);
                instructions.forEach((line, index) => {
                    doc.text(line, instructionsX + 3, newInstructionsY + (index * 5));
                });
            } else {
                // Add background for payment instructions - aligned with totals box
                doc.setFillColor(248, 250, 252);
                doc.rect(instructionsX, instructionsStartY - 15, instructionsWidth, 8, 'F');
                
                doc.setFont(undefined, 'bold');
                doc.setFontSize(12);
                doc.setTextColor(111, 115, 120);
                doc.text('PAYMENT INSTRUCTIONS', instructionsX + 3, instructionsStartY - 9);
                
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                doc.setTextColor(45, 55, 72);
                
                // Well-formatted payment instructions with proper alignment
                const instructions = doc.splitTextToSize(invoiceData.paymentInstructions, instructionsWidth - 6);
                const instructionsY = instructionsStartY;
                
                // Check if instructions will fit on current page
                const instructionsEndY = instructionsY + (instructions.length * 5);
                if (instructionsEndY > pageHeight - 50) {
                    // Split instructions across pages if needed
                    doc.addPage();
                    const newInstructionsY = 40;
                    
                    doc.setFillColor(248, 250, 252);
                    doc.rect(instructionsX, newInstructionsY - 15, instructionsWidth, 8, 'F');
                    
                    doc.setFont(undefined, 'bold');
                    doc.setFontSize(12);
                    doc.setTextColor(111, 115, 120);
                    doc.text('PAYMENT INSTRUCTIONS (continued)', instructionsX + 3, newInstructionsY - 9);
                    
                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(45, 55, 72);
                    
                    instructions.forEach((line, index) => {
                        doc.text(line, instructionsX + 3, newInstructionsY + (index * 5));
                    });
                } else {
                    instructions.forEach((line, index) => {
                        doc.text(line, instructionsX + 3, instructionsY + (index * 5));
                    });
                }
            }
        }
        
        // Add professional footer
        const footerPageHeight = doc.internal.pageSize.height;
        const footerY = footerPageHeight - 20;
        
        // Footer background
        doc.setFillColor(248, 250, 252);
        doc.rect(0, footerY - 3, 210, 15, 'F');
        
        // Footer border
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(20, footerY - 3, 190, footerY - 3);
        
        // Footer text
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(113, 128, 150);
        doc.text('Thank you for choosing Proton Studio!', 105, footerY + 1, { align: 'center' });
        doc.text('Professional • Reliable • Creative', 105, footerY + 6, { align: 'center' });
        
        // Save the PDF
        const fileName = `Invoice_${invoiceData.invoiceNumber}_${invoiceData.clientName || 'Client'}.pdf`;
        doc.save(fileName);
        
        // Show success message
        showSuccessMessage('PDF invoice generated successfully!');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please check your input and try again.');
    } finally {
        // Reset button state
        generateBtn.textContent = originalText;
        generateBtn.disabled = false;
    }
}

// Validate form before PDF generation
function validateForm() {
    const requiredFields = [
        { id: 'invoiceNumber', name: 'Invoice Number' },
        { id: 'invoiceDate', name: 'Invoice Date' },
        { id: 'dueDate', name: 'Due Date' },
        { id: 'clientName', name: 'Client Name' }
    ];
    
    for (const field of requiredFields) {
        const element = document.getElementById(field.id);
        if (!element.value.trim()) {
            alert(`Please fill in the ${field.name} field.`);
            element.focus();
            return false;
        }
    }
    
    // Check if at least one service item has a description
    const hasValidItems = serviceItems.some(item => 
        item.description && item.description.trim() !== ''
    );
    
    if (!hasValidItems) {
        alert('Please add at least one service item with a description.');
        return false;
    }
    
    return true;
}

// Get all form data
function getFormData() {
    return {
        invoiceNumber: document.getElementById('invoiceNumber').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        dueDate: document.getElementById('dueDate').value,
        clientName: document.getElementById('clientName').value,
        clientEmail: document.getElementById('clientEmail').value,
        clientPhone: document.getElementById('clientPhone').value,
        clientCompany: document.getElementById('clientCompany').value,
        clientAddress: document.getElementById('clientAddress').value,
        paymentInstructions: document.getElementById('paymentInstructions').value,
        serviceItems: serviceItems
    };
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Clear the entire form
function clearForm() {
    if (confirm('Are you sure you want to clear all form data? This action cannot be undone.')) {
        // Clear all input fields
        document.querySelectorAll('input, textarea').forEach(input => {
            if (input.type !== 'date') {
                input.value = '';
            }
        });
        
        // Clear service items
        document.getElementById('itemsContainer').innerHTML = '';
        serviceItems = [];
        itemCounter = 0;
        
        // Reinitialize form
        initializeForm();
        addServiceItem();
        calculateTotals();
        
        showSuccessMessage('Form cleared successfully!');
    }
}

// Show success message
function showSuccessMessage(message) {
    // Remove existing success message
    const existingMessage = document.querySelector('.success-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    // Insert after the main heading
    const heading = document.querySelector('.billing-form h2');
    heading.parentNode.insertBefore(successDiv, heading.nextSibling);
    
    // Show the message
    setTimeout(() => {
        successDiv.classList.add('show');
    }, 100);
    
    // Hide the message after 3 seconds
    setTimeout(() => {
        successDiv.classList.remove('show');
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 300);
    }, 3000);
}

// Preview invoice functionality
function previewInvoice() {
    if (!validateForm()) {
        return;
    }
    
    const invoiceData = getFormData();
    const modal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    
    // Calculate totals
    const subtotal = serviceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = serviceItems.reduce((sum, item) => {
        const itemSubtotal = item.price * item.quantity;
        return sum + (itemSubtotal * (item.discount / 100));
    }, 0);
    const totalAmount = subtotal - totalDiscount;
    
    // Generate preview HTML with exact PDF layout
    previewContent.innerHTML = `
        <div class="preview-invoice">
            <div class="preview-header" style="padding: 15px 20px; background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border-top: 3px solid #4299e1; margin-bottom: 25px;">
                <div class="preview-company">
                    <img src="Img.png" alt="Proton Studio Logo" style="width: 50px; height: 50px;">
                    <div class="preview-company-text">
                        <h1 style="font-size: 1.3rem; margin-bottom: 3px;">Proton Studio</h1>
                        <p style="font-size: 0.75rem; margin: 1px 0;">Professional Film & Media Services</p>
                        <p style="font-size: 0.7rem; color: #718096; margin: 1px 0;">1401 Bahria Orchard, Lahore, Punjab 54000</p>
                        <p style="font-size: 0.7rem; color: #718096; margin: 1px 0;">Email: info@protonstudio.com | Phone: +92 300 1234567</p>
                    </div>
                </div>
                <div class="preview-invoice-info">
                    <div class="preview-invoice-title" style="padding: 8px 15px; font-size: 1rem; margin-bottom: 8px;">INVOICE #${invoiceData.invoiceNumber}</div>
                    <p style="font-size: 0.75rem; margin: 2px 0;"><strong>Due:</strong> ${formatDate(invoiceData.dueDate)}</p>
                </div>
            </div>
            
            <div class="preview-client-info" style="margin-bottom: 20px;">
                <div class="preview-section">
                    <h3 style="background: #f8fafc; padding: 3px 6px; border-radius: 3px; margin-bottom: 10px; font-size: 0.8rem;">BILL TO</h3>
                    <p style="font-weight: bold; margin: 4px 0;">${invoiceData.clientName}</p>
                    ${invoiceData.clientEmail ? `<p style="font-size: 0.8rem; margin: 2px 0;">Email: ${invoiceData.clientEmail}</p>` : ''}
                    ${invoiceData.clientCompany ? `<p style="font-size: 0.8rem; margin: 2px 0;">Company: ${invoiceData.clientCompany}</p>` : ''}
                    ${invoiceData.clientPhone ? `<p style="font-size: 0.8rem; margin: 2px 0;">Phone: ${invoiceData.clientPhone}</p>` : ''}
                    ${invoiceData.clientAddress ? `<p style="font-size: 0.8rem; margin: 2px 0;">Address:<br>&nbsp;&nbsp;&nbsp;${invoiceData.clientAddress.replace(/\n/g, '<br>&nbsp;&nbsp;&nbsp;')}</p>` : ''}
                </div>
                <div class="preview-section">
                    <h3 style="background: #f8fafc; padding: 3px 6px; border-radius: 3px; margin-bottom: 10px; font-size: 0.8rem;">INVOICE DATE</h3>
                    <p style="font-weight: bold; margin: 4px 0;">${formatDate(invoiceData.invoiceDate)}</p>
                </div>
            </div>
            
            <table class="preview-table" style="margin: 15px 0; font-size: 0.85rem;">
                <thead>
                    <tr>
                        <th style="text-align: left; width: 42%; padding: 8px 6px; font-size: 0.8rem;">DESCRIPTION</th>
                        <th style="text-align: center; width: 12%; padding: 8px 6px; font-size: 0.8rem;">QTY</th>
                        <th style="text-align: right; width: 15%; padding: 8px 6px; font-size: 0.8rem;">PRICE</th>
                        <th style="text-align: right; width: 15%; padding: 8px 6px; font-size: 0.8rem;">DISCOUNT</th>
                        <th style="text-align: right; width: 16%; padding: 8px 6px; font-size: 0.8rem;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${serviceItems.filter(item => item.description).map(item => {
                        const itemSubtotal = item.price * item.quantity;
                        const itemDiscount = itemSubtotal * (item.discount / 100);
                        const itemTotal = itemSubtotal - itemDiscount;
                        return `
                            <tr>
                                <td style="text-align: left; padding: 6px; font-size: 0.8rem;">${item.description}</td>
                                <td style="text-align: center; padding: 6px; font-size: 0.8rem;">${item.quantity}</td>
                                <td style="text-align: right; padding: 6px; font-size: 0.8rem;">PKR ${item.price.toFixed(2)}</td>
                                <td style="text-align: right; padding: 6px; font-size: 0.8rem; color: #f56565;">PKR ${itemDiscount.toFixed(2)}</td>
                                <td style="text-align: right; padding: 6px; font-size: 0.8rem; font-weight: bold; color: #4299e1;">PKR ${itemTotal.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            
            <div class="preview-totals">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-top: 15px; width: 260px; margin-left: auto;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.8rem; color: #718096;">
                        <span>Subtotal:</span>
                        <span style="color: #2d3748;">PKR ${subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.8rem; color: #718096;">
                        <span>Discount:</span>
                        <span style="color: #f56565;">-PKR ${totalDiscount.toFixed(2)}</span>
                    </div>
                    <div style="background: #4299e1; color: white; padding: 8px 10px; border-radius: 3px; margin: -12px -12px -12px -12px; margin-top: 6px;">
                        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 0.85rem; align-items: center;">
                            <span>AMOUNT DUE:</span>
                            <span>PKR ${totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${invoiceData.paymentInstructions ? `
                <div class="preview-section" style="margin-top: 25px;">
                    <h3 style="background: #f8fafc; padding: 3px 6px; border-radius: 3px; margin-bottom: 10px; font-size: 0.8rem;">PAYMENT INSTRUCTIONS</h3>
                    <p style="background: #f8fafc; padding: 12px; border-radius: 6px; line-height: 1.4; font-size: 0.85rem;">${invoiceData.paymentInstructions}</p>
                </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 25px; padding: 12px; background: #f8fafc; border-radius: 6px; border-top: 1px solid #e2e8f0;">
                <p style="color: #718096; font-size: 0.75rem; margin: 3px 0;">Thank you for choosing Proton Studio!</p>
                <p style="color: #718096; font-size: 0.75rem; margin: 3px 0;">Professional • Reliable • Creative</p>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Close preview modal
function closePreview() {
    const modal = document.getElementById('previewModal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('previewModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Auto-save functionality (optional - saves to localStorage)
function autoSave() {
    const formData = getFormData();
    localStorage.setItem('protonBillingDraft', JSON.stringify(formData));
}

// Load auto-saved data (optional)
function loadAutoSaved() {
    const saved = localStorage.getItem('protonBillingDraft');
    if (saved && confirm('Would you like to load your previously saved draft?')) {
        const data = JSON.parse(saved);
        
        // Load basic fields
        document.getElementById('invoiceNumber').value = data.invoiceNumber || '';
        document.getElementById('clientName').value = data.clientName || '';
        document.getElementById('clientEmail').value = data.clientEmail || '';
        document.getElementById('clientPhone').value = data.clientPhone || '';
        document.getElementById('clientCompany').value = data.clientCompany || '';
        document.getElementById('clientAddress').value = data.clientAddress || '';
        document.getElementById('paymentInstructions').value = data.paymentInstructions || '';
        
        // Load service items
        if (data.serviceItems && data.serviceItems.length > 0) {
            // Clear existing items
            document.getElementById('itemsContainer').innerHTML = '';
            serviceItems = [];
            itemCounter = 0;
            
            // Add saved items
            data.serviceItems.forEach(item => {
                addServiceItem();
                const lastItem = document.querySelector('.service-item:last-child');
                lastItem.querySelector('.item-description').value = item.description || '';
                lastItem.querySelector('.item-price').value = item.price || '';
                lastItem.querySelector('.item-quantity').value = item.quantity || 1;
                lastItem.querySelector('.item-discount').value = item.discount || 0;
            });
        }
        
        calculateTotals();
    }
}

// Auto-save on form changes (debounced)
let autoSaveTimeout;
document.addEventListener('input', function() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(autoSave, 2000); // Save after 2 seconds of inactivity
});

// Load auto-saved data on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadAutoSaved, 1000); // Load after initialization
});
