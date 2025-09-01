/**
 * Input validation middleware using express-validator
 */
import { body, param, query, validationResult } from 'express-validator';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input data',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

/**
 * Email validation rules
 */
export const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
];

/**
 * Newsletter subscription validation
 */
export const validateNewsletterSubscription = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
  body('interests.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each interest must be between 1 and 100 characters'),
  handleValidationErrors
];

/**
 * Contact form validation
 */
export const validateContactForm = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name is required and must be between 1 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('organization')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Organization name must be less than 200 characters'),
  body('inquiry_type')
    .isIn(['general', 'partnership', 'media', 'technical', 'story_submission'])
    .withMessage('Please select a valid inquiry type'),
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject is required and must be between 1 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message is required and must be between 10 and 2000 characters'),
  handleValidationErrors
];

/**
 * Story query validation
 */
export const validateStoryQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('featured')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Featured must be true or false'),
  query('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const tags = value.split(',');
        return tags.every(tag => tag.trim().length > 0 && tag.trim().length <= 50);
      }
      return false;
    })
    .withMessage('Tags must be comma-separated strings, each less than 50 characters'),
  handleValidationErrors
];

/**
 * Storyteller query validation
 */
export const validateStorytellerQuery = [
  query('active_only')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Active_only must be true or false'),
  query('with_stories')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('With_stories must be true or false'),
  handleValidationErrors
];

/**
 * ID parameter validation
 */
export const validateId = [
  param('id')
    .isUUID()
    .withMessage('Please provide a valid ID'),
  handleValidationErrors
];

/**
 * Platform media upload validation
 */
export const validateMediaUpload = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  body('privacy_level')
    .optional()
    .isIn(['public', 'private', 'organization'])
    .withMessage('Privacy level must be public, private, or organization'),
  handleValidationErrors
];

/**
 * API key validation
 */
export const validateApiKey = [
  body('api_key')
    .isLength({ min: 32, max: 128 })
    .withMessage('API key must be between 32 and 128 characters'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('API key name is required and must be between 1 and 100 characters'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  handleValidationErrors
];

/**
 * Database pagination validation
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['created_at', 'updated_at', 'name', 'title'])
    .withMessage('Sort field must be one of: created_at, updated_at, name, title'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  handleValidationErrors
];

export default {
  handleValidationErrors,
  validateEmail,
  validateNewsletterSubscription,
  validateContactForm,
  validateStoryQuery,
  validateStorytellerQuery,
  validateId,
  validateMediaUpload,
  validateApiKey,
  validatePagination
};