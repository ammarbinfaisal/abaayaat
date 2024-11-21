export class AppError extends Error {
    constructor(message, statusCode, code = 'UNKNOWN_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        Error.captureStackTrace(this, this.constructor);
    }
}

export const handleDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];
    return new AppError(
        `Duplicate ${field} value: ${value}. Please use another value.`,
        409,
        'DUPLICATE_KEY_ERROR'
    );
};

export const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log the error
    logger.log('error', `${req.method} ${req.originalUrl} - ${err.message}`, err);

    // Handle specific error types
    let error = err;
    if (err.code === 11000) {
        error = handleDuplicateKeyError(err);
    }

    // Development vs Production error response
    if (process.env.NODE_ENV === 'development') {
        res.status(error.statusCode).json({
            status: error.status,
            error: error,
            message: error.message,
            stack: error.stack
        });
    } else {
        res.status(error.statusCode).json({
            status: error.status,
            message: error.message
        });
    }
};