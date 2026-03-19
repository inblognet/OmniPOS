const express = require('express');
const router = express.Router();
const supplierService = require('../services/supplierService');

router.get('/', async (req, res) => res.json(await supplierService.getAllSuppliers()));
router.post('/', async (req, res) => res.json(await supplierService.createSupplier(req.body)));
router.put('/:id', async (req, res) => res.json(await supplierService.updateSupplier(req.params.id, req.body)));
router.delete('/:id', async (req, res) => res.json(await supplierService.deleteSupplier(req.params.id)));

module.exports = router;