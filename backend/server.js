
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ]
}));

app.use(express.json());

// API status
app.get('/', (req, res) => {
    res.json({
        message: 'Products CRUD API is running',
        endpoints: {
            getAll: 'GET /api/products',
            getOne: 'GET /api/products/:id',
            create: 'POST /api/products',
            update: 'PUT /api/products/:id',
            delete: 'DELETE /api/products/:id'
        }
    });
});

// GET all products
app.get('/api/products', async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM products ORDER BY id'
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// GET one product
app.get('/api/products/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const [rows] = await pool.execute(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        next(error);
    }
});

// POST a new product
app.post('/api/products', async (req, res, next) => {
    try {
        const {
            product_name, brand, category,
            price, stock_quantity, description
        } = req.body;

        if (
            typeof product_name !== 'string' || !product_name.trim() ||
            typeof brand !== 'string' || !brand.trim() ||
            typeof category !== 'string' || !category.trim() ||
            price === undefined || price === null ||
            !Number.isFinite(Number(price)) || Number(price) < 0 ||
            !Number.isInteger(stock_quantity) || stock_quantity < 0
        ) {
            return res.status(400).json({
                error: 'Provide product_name, brand, category, a valid non-negative price, and a non-negative integer stock_quantity.'
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO products
            (product_name, brand, category, price, stock_quantity, description)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                product_name.trim(),
                brand.trim(),
                category.trim(),
                Number(price),
                stock_quantity,
                description ?? null
            ]
        );

        const [rows] = await pool.execute(
            'SELECT * FROM products WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            message: 'Product created successfully',
            product: rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// PUT: update a product
app.put('/api/products/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const {
            product_name, brand, category,
            price, stock_quantity, description
        } = req.body;

        if (
            typeof product_name !== 'string' || !product_name.trim() ||
            typeof brand !== 'string' || !brand.trim() ||
            typeof category !== 'string' || !category.trim() ||
            price === undefined || price === null ||
            !Number.isFinite(Number(price)) || Number(price) < 0 ||
            !Number.isInteger(stock_quantity) || stock_quantity < 0
        ) {
            return res.status(400).json({
                error: 'Provide product_name, brand, category, a valid non-negative price, and a non-negative integer stock_quantity.'
            });
        }

        const [result] = await pool.execute(
            `UPDATE products
             SET product_name = ?, brand = ?, category = ?,
                 price = ?, stock_quantity = ?, description = ?
             WHERE id = ?`,
            [
                product_name.trim(),
                brand.trim(),
                category.trim(),
                Number(price),
                stock_quantity,
                description ?? null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            const [rows] = await pool.execute(
                'SELECT id FROM products WHERE id = ?',
                [id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }
        }

        const [rows] = await pool.execute(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );

        res.json({
            message: 'Product updated successfully',
            product: rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// DELETE a product
app.delete('/api/products/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const [result] = await pool.execute(
            'DELETE FROM products WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        next(error);
    }
});

// Unknown routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err);

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    res.status(500).json({ error: 'Internal server error' });
});

// Verify database connection before starting
async function startServer() {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL connection verified.');
        connection.release();

        app.listen(PORT, () => {
            console.log(`Products API running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Could not connect to MySQL:', error.message);
        process.exit(1);
    }
}

startServer();
