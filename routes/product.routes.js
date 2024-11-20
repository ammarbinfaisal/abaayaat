// src/routes/product.routes.js

import express from 'express';
import { Product } from '../models/product.js';
import { createObjectCsvWriter } from 'csv-writer';
import { convertArabicToEnglish } from '../utils/helpers.js';
import { startScraping } from '../utils/scraper.js';

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
    try {
        const products = await Product.find({}, { _id: 0, __v: 0 }).lean();
        
        if (products.length === 0) {
            return res.status(404).json({ error: 'No products found' });
        }

        const csvWriter = createObjectCsvWriter({
            path: 'products-export.csv',
            header: [
                {id: 'sku', title: 'sku'},
                {id: 'barcode', title: 'barcode'},
                // ... (previous header configuration)
            ]
        });

        await csvWriter.writeRecords(products);

        res.download('products-export.csv', 'abyat-products.csv');
    } catch (error) {
        res.status(500).json({ error: 'Export failed', details: error.message });
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

// Get single product by SKU
router.get('/products/:sku', async (req, res) => {
    try {
        const product = await Product.findOne({ sku: req.params.sku });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product', details: error.message });
    }
});

// Update product
router.put('/products/:sku', async (req, res) => {
    try {
        const product = await Product.findOneAndUpdate(
            { sku: req.params.sku },
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update product', details: error.message });
    }
});

// Delete product
router.delete('/products/:sku', async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ sku: req.params.sku });
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product', details: error.message });
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