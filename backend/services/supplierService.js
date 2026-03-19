const db = require('../config/db');

const getAllSuppliers = async () => {
    const { rows } = await db.query('SELECT * FROM suppliers ORDER BY id DESC');
    return rows;
};

const createSupplier = async (data) => {
    const { rows } = await db.query(`
        INSERT INTO suppliers (name, nic, phone, company_name, address, items_brand, category_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [data.name, data.nic, data.phone, data.companyName, data.address, data.itemsBrand, data.categoryType]);
    return rows[0];
};

const updateSupplier = async (id, data) => {
    const { rows } = await db.query(`
        UPDATE suppliers SET name=$1, nic=$2, phone=$3, company_name=$4, address=$5, items_brand=$6, category_type=$7, updated_at=NOW()
        WHERE id=$8 RETURNING *
    `, [data.name, data.nic, data.phone, data.companyName, data.address, data.itemsBrand, data.categoryType, id]);
    return rows[0];
};

const deleteSupplier = async (id) => {
    await db.query('DELETE FROM suppliers WHERE id = $1', [id]);
    return { success: true };
};

module.exports = { getAllSuppliers, createSupplier, updateSupplier, deleteSupplier };