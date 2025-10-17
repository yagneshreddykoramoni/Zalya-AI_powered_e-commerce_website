const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

router.post('/', auth, orderController.createOrder);
router.get('/', auth, orderController.getUserOrders);
router.get('/:orderId', auth, orderController.getOrderById);
router.get('/:orderId/invoice', auth, orderController.downloadInvoice);

module.exports = router;