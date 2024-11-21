import fs from 'fs';
import express from 'express';
import { Product } from '../models/product.js';
import { createObjectCsvWriter } from 'csv-writer';
import { startScraping } from '../utils/scraper.js';
import path from "path"

const router = express.Router();

// Start scraping
router.post('/scrape', async (req, res) => {
    try {
        const { startPage = 1, endPage } = req.body;
        const scraping = startScraping(startPage, endPage);
        res.json({ message: 'Scraping started', status: 'running' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start scraping', details: error.message });
    }
});

// Get scraping status
router.get('/scrape/status', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        res.json({
            totalProducts,
            lastUpdated: new Date(),
            status: 'completed'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get status', details: error.message });
    }
});

// Export products to CSV
router.get('/export-csv', async (req, res) => {
    const exportPath = path.join(process.cwd(), 'exports');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `abyat-products-${timestamp}.csv`;
    const filepath = path.join(exportPath, filename);

    try {
        // Create exports directory if it doesn't exist
        if (!fs.existsSync(exportPath)) {
            fs.mkdirSync(exportPath, { recursive: true });
        }

        // Fetch all products
        const products = await Product.find({}, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }).lean();
        
        if (products.length === 0) {
            return res.status(404).json({ error: 'No products found to export' });
        }

        // Define CSV header
        const csvWriter = createObjectCsvWriter({
            path: filepath,
            header: [
                { id: 'sku', title: 'SKU' },
                { id: 'barcode', title: 'Barcode' },
                { id: 'store', title: 'Store' },
                { id: 'view_code', title: 'View Code' },
                { id: 'attribute_set_code', title: 'Attribute Set Code' },
                { id: 'product_type', title: 'Product Type' },
                { id: 'product_websites', title: 'Product Websites' },
                { id: 'link_url', title: 'Link URL' },
                { id: 'name', title: 'Name' },
                { id: 'meta_title', title: 'Meta Title' },
                { id: 'url_key', title: 'URL Key' },
                { id: 'description', title: 'Description' },
                { id: 'short_description', title: 'Short Description' },
                { id: 'categories1', title: 'Categories1' },
                { id: 'categories2', title: 'Categories2' },
                { id: 'categories3', title: 'Categories3' },
                { id: 'categories', title: 'Categories' },
                { id: 'raw_materials_n', title: 'Raw Materials N' },
                { id: 'style', title: 'Style' },
                { id: 'color', title: 'Color' },
                { id: 'ts_dimensions_height', title: 'TS Dimensions Height' },
                { id: 'ts_dimensions_width', title: 'TS Dimensions Width' },
                { id: 'ts_dimensions_length', title: 'TS Dimensions Length' },
                { id: 'weight', title: 'Weight' },
                { id: 'manufacturer', title: 'Manufacturer' },
                { id: 'cost', title: 'Cost' },
                { id: 'price', title: 'Price' },
                { id: 'special_price', title: 'Special Price' },
                { id: 'visibility', title: 'Visibility' },
                { id: 'tax_class_name', title: 'Tax Class Name' },
                { id: 'news_from_date', title: 'News From Date' },
                { id: 'news_to_date', title: 'News To Date' },
                { id: 'base_image', title: 'Base Image' },
                { id: 'small_image', title: 'Small Image' },
                { id: 'swatch_image', title: 'Swatch Image' },
                { id: 'thumbnail_image', title: 'Thumbnail Image' },
                { id: 'additional_images', title: 'Additional Images' },
                { id: 'product_online', title: 'Product Online' },
                { id: 'qty', title: 'Qty' },
                { id: 'max_cart_qty', title: 'Max Cart Qty' },
                { id: 'out_of_stock_qty', title: 'Out of Stock Qty' },
                { id: 'allow_backorders', title: 'Allow Backorders' },
                { id: 'is_in_stock', title: 'Is In Stock' },
                { id: 'manage_stock', title: 'Manage Stock' },
                { id: 'vendor_score', title: 'Vendor Score' },
                { id: 'supplier', title: 'Supplier' },
                { id: 'mgs_brand', title: 'MGS Brand' }
            ]
        });

        // Process products to ensure all fields are properly formatted
        const processedProducts = products.map(product => ({
            ...product,
            store: product.store || 'default',
            view_code: product.view_code || '',
            attribute_set_code: product.attribute_set_code || 'default',
            product_type: product.product_type || 'simple',
            product_websites: product.product_websites || 'base',
            link_url: product.link_url || '',
            visibility: product.visibility || 'catalog,search',
            tax_class_name: product.tax_class_name || 'Taxable Goods',
            news_from_date: product.news_from_date || '',
            news_to_date: product.news_to_date || '',
            special_price: product.special_price || '',
            out_of_stock_qty: product.out_of_stock_qty || '0',
            allow_backorders: product.allow_backorders || '0',
            vendor_score: product.vendor_score || '',
            product_online: product.is_in_stock ? '1' : '0',
            is_in_stock: product.qty > 0 ? '1' : '0',
            manage_stock: '1'
        }));

        // Write to CSV file
        await csvWriter.writeRecords(processedProducts);

        // Set response headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Stream the file
        const fileStream = fs.createReadStream(filepath);
        fileStream.pipe(res);

        // Clean up the file after sending
        fileStream.on('end', () => {
            fs.unlink(filepath, (err) => {
                if (err) console.error('Error deleting temporary file:', err);
            });
        });

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ 
            error: 'Failed to export products', 
            details: error.message 
        });
    }
});

// Get all products with filtering
router.get('/products', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            priceMin,
            priceMax,
            inStock,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = {};
        
        if (category) filter.categories1 = category;
        if (priceMin || priceMax) {
            filter.price = {};
            if (priceMin) filter.price.$gte = priceMin;
            if (priceMax) filter.price.$lte = priceMax;
        }
        if (inStock === 'true') filter.is_in_stock = 1;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Execute query with pagination
        const products = await Product.find(filter)
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Get total count for pagination
        const total = await Product.countDocuments(filter);

        res.json({
            products,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products', details: error.message });
    }
});

// Get product categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await Product.distinct('categories1');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
    }
});

// Get product statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    averagePrice: { $avg: { $toDouble: "$price" } },
                    inStock: { 
                        $sum: { 
                            $cond: [{ $eq: ["$is_in_stock", 1] }, 1, 0]
                        }
                    },
                    outOfStock: { 
                        $sum: { 
                            $cond: [{ $eq: ["$is_in_stock", 0] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.json(stats[0] || {
            totalProducts: 0,
            averagePrice: 0,
            inStock: 0,
            outOfStock: 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
    }
});

export default router;