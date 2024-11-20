// src/models/product.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    sku: {
        type: String,
        required: true,
        unique: true, // Make SKU the unique identifier instead
        trim: true
    },
    barcode: {
        type: String,
        trim: true
    },
    store: {
        type: String,
        default: 'default'
    },
    attribute_set_code: {
        type: String,
        default: 'default'
    },
    product_type: {
        type: String,
        default: 'simple'
    },
    product_websites: {
        type: String,
        default: 'base'
    },
    link_url: String,
    name: {
        type: String,
        required: true,
        trim: true
    },
    meta_title: String,
    url_key: {
        type: String,
        trim: true,
        // Remove unique constraint from url_key
    },
    description: String,
    short_description: String,
    categories1: String,
    categories2: String,
    categories3: String,
    categories: String,
    raw_materials_n: String,
    style: String,
    color: String,
    ts_dimensions_height: String,
    ts_dimensions_width: String,
    ts_dimensions_length: String,
    weight: String,
    manufacturer: String,
    cost: String,
    price: String,
    special_price: String,
    visibility: {
        type: String,
        default: 'catalog,search'
    },
    tax_class_name: {
        type: String,
        default: 'Taxable Goods'
    },
    news_from_date: String,
    news_to_date: String,
    base_image: String,
    small_image: String,
    swatch_image: String,
    thumbnail_image: String,
    additional_images: String,
    product_online: {
        type: Number,
        default: 1
    },
    qty: {
        type: Number,
        default: 0
    },
    max_cart_qty: Number,
    out_of_stock_qty: {
        type: Number,
        default: 0
    },
    allow_backorders: {
        type: Number,
        default: 0
    },
    is_in_stock: {
        type: Number,
        default: 0
    },
    manage_stock: {
        type: Number,
        default: 1
    },
    vendor_score: String,
    supplier: String,
    mgs_brand: String
}, {
    timestamps: true,
    versionKey: false // Disable the version key
});

// Create a compound index on SKU and store for additional uniqueness constraint
productSchema.index({ sku: 1, store: 1 }, { unique: true });

// Pre-save middleware to ensure url_key is unique by appending a timestamp if necessary
productSchema.pre('save', async function(next) {
    if (this.isModified('url_key')) {
        let baseUrlKey = this.url_key;
        let urlKey = baseUrlKey;
        let counter = 1;
        
        // Keep trying until we find a unique url_key
        while (true) {
            const existingProduct = await mongoose.models.Product.findOne({ 
                url_key: urlKey,
                _id: { $ne: this._id } // Exclude current document when updating
            });
            
            if (!existingProduct) {
                this.url_key = urlKey;
                break;
            }
            
            // Append counter to make URL key unique
            urlKey = `${baseUrlKey}-${counter}`;
            counter++;
        }
    }
    next();
});

// Static method to handle bulk inserts with unique url_keys
productSchema.statics.insertManyWithUniqueUrls = async function(products) {
    const processedProducts = [];
    const urlKeyMap = new Map();

    for (const product of products) {
        let baseUrlKey = product.url_key;
        let urlKey = baseUrlKey;
        let counter = 1;

        // Keep trying until we find a unique url_key
        while (urlKeyMap.has(urlKey)) {
            urlKey = `${baseUrlKey}-${counter}`;
            counter++;
        }

        urlKeyMap.set(urlKey, true);
        processedProducts.push({
            ...product,
            url_key: urlKey
        });
    }

    return await this.insertMany(processedProducts, { ordered: false });
};

export const Product = mongoose.model('Product', productSchema);