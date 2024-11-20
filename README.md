# Abaayaat Product Scraper and API

A Node.js application that scrapes product data from Abyat's website and provides a RESTful API to manage the product catalog. The application uses MongoDB for data storage and includes features for data export, filtering, and statistics.

## Features

- 🔄 Automated product scraping from Abyat's website
- 🗄️ MongoDB integration for data storage
- 🚀 RESTful API endpoints for product management
- 📊 Product statistics and category management
- 📁 CSV export functionality
- 🔍 Advanced product filtering and search
- 🖼️ Image URL management
- 🔢 Arabic to English number conversion

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Docker (optional, for containerized deployment)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/abaayaat.git
cd abaayaat
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/abyat
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Using Docker
```bash
docker-compose up -d
```

## API Endpoints

### Product Management

- `GET /api/products` - Get all products with filtering options
  - Query parameters:
    - `page` (default: 1)
    - `limit` (default: 10)
    - `category`
    - `priceMin`
    - `priceMax`
    - `inStock`
    - `search`
    - `sortBy` (default: 'createdAt')
    - `sortOrder` (default: 'desc')

- `GET /api/products/:sku` - Get a single product by SKU
- `PUT /api/products/:sku` - Update a product
- `DELETE /api/products/:sku` - Delete a product

### Data Collection

- `POST /api/scrape` - Start the scraping process
- `GET /api/scrape/status` - Get scraping status

### Data Export

- `GET /api/export-csv` - Export products to CSV

### Statistics and Categories

- `GET /api/categories` - Get all product categories
- `GET /api/stats` - Get product statistics

## Data Model

The product schema includes the following main fields:

```javascript
{
  sku: String,              // Unique product identifier
  name: String,             // Product name
  price: String,            // Product price
  description: String,      // Product description
  categories: String,       // Product categories
  images: String,           // Product images
  stock: Number,            // Stock quantity
  dimensions: {            
    width: String,
    height: String,
    length: String
  }
}
```

## Error Handling

The application includes comprehensive error handling:
- Validation errors for required fields
- Duplicate SKU prevention
- Network error handling during scraping
- Database connection error handling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Project Structure

```
abaayaat/
├── models/
│   └── product.js         # Product database model
├── routes/
│   └── product.routes.js  # API routes
├── utils/
│   ├── scraper.js        # Web scraping logic
│   └── helpers.js        # Utility functions
├── app.js                # Express application setup
├── docker-compose.yml    # Docker configuration
└── package.json         # Project dependencies
```
