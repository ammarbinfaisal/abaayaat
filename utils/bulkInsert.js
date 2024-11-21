import { logger } from './logger.js';

export class BulkOperationResult {
    constructor() {
        this.successful = [];
        this.duplicates = [];
        this.errors = [];
    }

    addSuccess(document) {
        this.successful.push(document);
    }

    addDuplicate(document, error) {
        this.duplicates.push({
            document,
            error: {
                message: error.message,
                keyPattern: error.keyPattern,
                keyValue: error.keyValue
            }
        });
    }

    addError(document, error) {
        this.errors.push({
            document,
            error: {
                message: error.message,
                name: error.name
            }
        });
    }

    get summary() {
        return {
            totalProcessed: this.successful.length + this.duplicates.length + this.errors.length,
            successfulCount: this.successful.length,
            duplicateCount: this.duplicates.length,
            errorCount: this.errors.length
        };
    }
}

export const handleBulkInsert = async (Model, documents) => {
    const result = new BulkOperationResult();
    
    try {
        // Attempt bulk insert with ordered: false to continue on errors
        await Model.insertMany(documents, { ordered: false })
            .then(docs => {
                docs.forEach(doc => result.addSuccess(doc));
            })
            .catch(error => {
                if (error.writeErrors) {
                    // Process partial success/failures from bulk operation
                    error.writeErrors.forEach(writeError => {
                        const doc = writeError.err.op;  // The document that caused the error
                        
                        if (writeError.code === 11000) {  // Duplicate key error
                            result.addDuplicate(doc, writeError.err);
                        } else {
                            result.addError(doc, writeError.err);
                        }
                    });

                    // Add successful inserts
                    if (error.insertedDocs) {
                        error.insertedDocs.forEach(doc => result.addSuccess(doc));
                    }
                }
            });

        // Log operation summary
        logger.log('info', 'Bulk insert operation completed', {
            summary: result.summary
        });

        return result;
    } catch (error) {
        logger.log('error', 'Bulk insert operation failed', error);
        throw error;
    }
};