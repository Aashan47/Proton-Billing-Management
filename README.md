# Proton Media - Billing Generator

A simple, professional web-based billing generator designed specifically for film and media agencies. Create invoices quickly and download them as PDF files without any backend requirements.

## Features

### 🎬 Film & Media Focused
- Tailored interface for creative services
- Pre-designed for video production, editing, photography services
- Professional invoice templates

### 📋 Easy Invoice Creation
- **Client Information**: Name, company, email, phone, address
- **Multiple Service Items**: Description, price, quantity, discount per item
- **Real-time Calculations**: Totals update as you type
- **Date Management**: Auto-sets current date and 30-day due date
- **Payment Instructions**: Customizable payment terms

### 📄 Professional PDF Generation
- Clean, professional invoice layout
- Company branding section
- Itemized services table
- Automatic calculations with discounts
- Payment instructions included
- Downloadable PDF with proper naming

### 💻 User Experience
- **Mobile & Desktop Friendly**: Responsive design works on all devices
- **No Login Required**: Start creating invoices immediately
- **Auto-save Draft**: Saves your work locally as you type
- **Form Validation**: Ensures all required fields are completed
- **Real-time Feedback**: Success messages and error handling

## Quick Start

1. **Open the Application**
   - Simply open `index.html` in any modern web browser
   - No server setup required - works offline!

2. **Fill Invoice Details**
   - Invoice number is auto-generated
   - Set your invoice and due dates
   - Enter client information

3. **Add Services**
   - Click "Add Item" to add services
   - Enter description, price, quantity, and discount
   - Watch totals calculate automatically

4. **Generate PDF**
   - Click "Generate PDF Invoice"
   - PDF downloads automatically with proper filename
   - Share with your clients!

## File Structure

```
Proton Billing/
├── index.html      # Main application file
├── styles.css      # Styling and responsive design
├── script.js       # Application logic and PDF generation
└── README.md       # This file
```

## Technology Stack

- **HTML5**: Modern semantic markup
- **CSS3**: Responsive design with flexbox/grid
- **Vanilla JavaScript**: No frameworks needed
- **jsPDF**: PDF generation library
- **jsPDF-AutoTable**: Table generation for itemized services

## Customization

### Company Information
Edit the header section in `index.html`:
```html
<div class="company-info">
    <h1>Your Company Name</h1>
    <p>Your Tagline</p>
</div>
```

### Styling
Modify colors and branding in `styles.css`:
```css
/* Primary brand color */
--primary-color: #3498db;
--secondary-color: #2c3e50;
```

### Default Services
Add common services to the description placeholder in `script.js`:
```javascript
placeholder="e.g., Video Production, Editing, Photography"
```

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## Features in Detail

### Auto-calculations
- **Item Totals**: Price × Quantity - Discount
- **Subtotal**: Sum of all item prices × quantities
- **Total Discount**: Sum of all discount amounts
- **Final Total**: Subtotal - Total Discount

### PDF Features
- Professional header with company info
- Invoice number and dates
- Complete client billing address
- Itemized services table
- Summary totals section
- Payment instructions
- Proper filename: `Invoice_[NUMBER]_[CLIENT].pdf`

### Form Validation
- Required fields: Invoice number, dates, client name
- At least one service item required
- Numeric validation for prices and quantities
- Date validation for invoice and due dates

### Data Persistence
- **Auto-save**: Saves draft to browser's local storage
- **Draft Recovery**: Offers to restore unsaved work
- **No Server**: All data stays in your browser

## Common Use Cases

### Video Production Invoice
```
Service: Video Production - Corporate Promo
Price: $2,500
Quantity: 1
Discount: 10% (early payment)
```

### Multi-Service Project
```
1. Pre-production Planning - $500 × 1
2. Video Shooting - $1,200 × 2 days
3. Post-production Editing - $800 × 1
4. Color Correction - $300 × 1
```

### Photography Package
```
1. Event Photography - $150 × 8 hours
2. Photo Editing - $200 × 1
3. Digital Gallery Setup - $100 × 1
```

## Tips for Best Results

1. **Consistent Pricing**: Use standard rates for common services
2. **Clear Descriptions**: Be specific about deliverables
3. **Professional Contact**: Update company contact information
4. **Payment Terms**: Customize payment instructions for your business
5. **File Naming**: PDFs auto-name with invoice number and client name

## Troubleshooting

### PDF Not Generating
- Check that all required fields are filled
- Ensure at least one service item has a description
- Try refreshing the page and filling form again

### Calculations Not Updating
- Make sure to click outside input fields after typing
- Check that numeric fields contain valid numbers
- Refresh page if calculations seem stuck

### Mobile Display Issues
- Use latest browser version
- Rotate device for better table viewing
- Zoom out if content appears cut off

## Support

This is a standalone application that runs entirely in your browser. No technical support is provided, but the code is well-commented for customization.

## License

Free to use and modify for your business needs.

---

**Created for Proton Media Agency** 🎬
*Professional Film & Media Services*
