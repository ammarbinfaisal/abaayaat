import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import { setTimeout } from 'timers/promises';
import { Product } from '../models/product.js';
import { handleBulkInsert } from './bulkInsert.js';

let scraping = false;

export async function startScraping() {
    if (scraping) {
        console.log("Already scraping");
        return;
    }

    scraping = true;

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1920, height: 1080 }
    });

    try {
        const page = await browser.newPage();
        let currentPage = 1;
        let hasNextPage = true;
        let totalProducts = 0;

        // Clear existing products
        await Product.deleteMany();

        while (hasNextPage) {
            console.log(`Scraping page ${currentPage}...`);
            const url = `https://www.abyat.com/sa/ar/category/wall_art_and_mirrors?page=${currentPage}`;

            console.log('Loading page...', url);
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 300 * 1000
            });

            await page.waitForSelector('.impression');

            console.log('Page loaded. Scraping products...');

            const products = await page.evaluate(() => {
                function convertArabicToEnglish(str) {
                    const numerals = {
                        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
                        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
                    };
                    return str ? str.replace(/[٠-٩]/g, d => numerals[d]) : '';
                }

                const productElements = document.querySelectorAll('.impression');
                console.log(productElements.length);


                return Array.from(productElements).map(product => {
                    // Extract basic product details
                    const titleEl = product.querySelector('.text-\\[16px\\]');
                    const colorDimensionEl = product.querySelector('div[class*="text-gray-dark"]');
                    const priceEl = product.querySelector('.price span');
                    const stockEl = product.querySelector('[data-stock-value]');
                    const imageEl = product.querySelector('img');
                    const linkEl = product.querySelector('a');

                    // Get product URL and ID
                    const fullUrl = linkEl?.href || '';
                    const productId = fullUrl.split('products/')[1] || '';

                    // Extract product name and ensure it's not empty
                    const productName = titleEl?.textContent?.trim() || 'Untitled Product';

                    // Extract dimensions and specs from text
                    const specs = colorDimensionEl?.textContent || '';
                    const dimensionMatch = specs.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
                    const [width, height] = dimensionMatch ? [dimensionMatch[1], dimensionMatch[2]] : ['', ''];

                    // Get price without currency symbol
                    const priceText = priceEl?.textContent.replace(/[^\d.]/g, '') || '0';

                    // Extract stock info with fallback values
                    const stockText = stockEl?.textContent || '';
                    const stockMatch = stockText.match(/تبقى (\d+)/);
                    const qty = stockMatch ? parseInt(convertArabicToEnglish(stockMatch[1])) : (stockText.includes('متوفر') ? 100 : 0);

                    // Generate SKU with fallback
                    const sku = productId ? `TAY-${productId}` : `TAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    // Get all product images
                    const baseImageUrl = imageEl?.src || '';
                    const productNum = productId;
                    const additionalImages = productNum ? [
                        `https://cdn.abyat.com/products/${productNum}/${productNum}_PI_1.png`,
                        `https://cdn.abyat.com/products/${productNum}/${productNum}_PI_2.png`,
                        `https://cdn.abyat.com/products/${productNum}/${productNum}_PI_3.png`,
                        `https://cdn.abyat.com/products/${productNum}/${productNum}_PI_4.png`
                    ].join(',') : '';

                    return {
                        sku: sku,
                        barcode: productId,
                        store: 'Default',
                        view_code: '',
                        attribute_set_code: 'default',
                        product_type: 'simple',
                        product_websites: 'base',
                        link_url: fullUrl,
                        name: productName,
                        meta_title: productName,
                        url_key: `${sku}-${productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                        description: productName,
                        short_description: productName,
                        categories1: 'أثاث وغرف',
                        categories2: 'أثاث غرف المعيشة',
                        categories3: 'خزائن',
                        categories: 'Home Decor/Wall Art & Mirrors',
                        raw_materials_n: 'خشب، زجاج',
                        style: 'عصري',
                        color: colorDimensionEl?.textContent?.split('|')[0]?.trim() || '',
                        ts_dimensions_height: height || '0',
                        ts_dimensions_width: width || '0',
                        ts_dimensions_length: '',
                        weight: '',
                        manufacturer: 'مستوردة',
                        cost: '',
                        price: priceText || '0',
                        special_price: '',
                        visibility: 'Catalog, Search',
                        tax_class_name: 'Taxable Goods',
                        news_from_date: new Date().toISOString(),
                        news_to_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                        base_image: baseImageUrl,
                        small_image: baseImageUrl,
                        swatch_image: baseImageUrl,
                        thumbnail_image: baseImageUrl,
                        additional_images: additionalImages,
                        product_online: 1,
                        qty: qty,
                        max_cart_qty: qty,
                        out_of_stock_qty: 0,
                        allow_backorders: 0,
                        is_in_stock: qty > 0 ? 1 : 0,
                        manage_stock: 1,
                        vendor_score: 2,
                        supplier: 'TAY',
                        mgs_brand: 'Abyat'
                    };
                });
            });

            // Filter out any products with invalid required fields
            const validProducts = products.filter(product => 
                product.name && 
                product.sku && 
                product.name !== 'Untitled Product'
            );

            // Save valid products to MongoDB
            if (validProducts.length > 0) {
                try {
                    await handleBulkInsert(Product, validProducts);
                    totalProducts += validProducts.length;
                    console.log(`Saved ${validProducts.length} products from page ${currentPage}`);
                } catch (error) {
                    if (error.code === 11000) {
                        console.log('Duplicate key error. Skipping duplicate products...');
                    }
                }
            }

            // Check for next page with Arabic numeral handling
            hasNextPage = await page.evaluate(() => {
                function convertArabicToEnglish(str) {
                    const numerals = {
                        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
                        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
                    };
                    return str ? str.replace(/[٠-٩]/g, d => numerals[d]) : '';
                }

                const pageNumbers = Array.from(document.querySelectorAll('.page-index h6'))
                    .map(el => el.textContent)
                    .filter(text => text && text.trim())
                    .map(text => parseInt(convertArabicToEnglish(text)))
                    .filter(num => !isNaN(num));

                const activePageEl = document.querySelector('.page-index.active');
                if (!activePageEl) return false;

                const currentPage = parseInt(convertArabicToEnglish(activePageEl.textContent));
                const maxPage = Math.max(...pageNumbers);

                return currentPage < maxPage;
            });

            currentPage++;
            await setTimeout(2000);
        }

        console.log(`Scraping complete. Saved ${totalProducts} products to MongoDB.`);

    } catch (error) {
        console.error('Error during scraping:', error);
        throw error;
    } finally {
        await browser.close();
        scraping = false;
    }
}