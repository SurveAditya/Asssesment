const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const killPort = require('kill-port');
const { ethers } = require('ethers');


require('dotenv').config();

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

const checkPort = async (port, maxPort = 65535) => {

    if (port > maxPort) {
        throw new Error("No available ports found");
    }

    try {
        await killPort(port, "tcp");
        await killPort(port, "udp");
        return port;
    } catch (err) {
        return checkPort(port + 1, maxPort);
    }
};

(async () => {
    const safePort = await checkPort(PORT);
    const getPort = (await import('get-port')).default; // dynamic import
    const final_port = await getPort({ port: safePort });

    console.log(`Port ${final_port} is free. Ready to start server.`);

    // Middleware
    app.use(cors({ origin: `http://localhost:${final_port}` }));
    app.use(express.json());
    app.use(morgan('dev'));

    // Routes
    app.use('/api/items', require('./routes/items'));
    app.use('/api/stats', require('./routes/stats'));

    require('./config/dbHandler.js').connect();

    /**
     * @route    GET /api/AdityaSurveApiTest
     * @desc     Fetch basic information from a sample smart contract (DAI stablecoin)
     * @author   Aditya Surve
     * @access   Public
     * @param    {Request}  req  - Express request object.
     * @param    {Response} res  - Express response object.
     * @returns  {JSON}{ name, symbol, totalSupplyRaw } - Basic contract information.
     * @throws   {500} - Server error if unable to fetch contract data.
     *
     * @example
     * // Example request
     * http://localhost:3009/api/AdityaSurveApiTest
     *
     * // Example response
     * {
     *   "name": "Dai Stablecoin",
     *   "symbol": "DAI",
     *   "totalSupplyRaw": "4325347679305227212992992621"
     * }
     */

    app.get('/api/AdityaSurveApiTest', async (req, res) => {
    try {
        // Using ethereum public node as RPC URL
        const RPC_URL = process.env.RPC_URL;
        // Got this address from Etherscan, it's the DAI stablecoin 
        const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
        // Here I am doing a read-only call to fetch some basic info about the DAI contract
        const ERC20_ABI = [
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function totalSupply() view returns (uint256)',
        ];

        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(DAI_ADDRESS, ERC20_ABI, provider);

        const name = await contract.name();
        const symbol = await contract.symbol();
        const totalSupply = await contract.totalSupply();

        const result = {
            name,
            symbol,
            totalSupplyRaw: totalSupply.toString(),
        };

        console.log('[AdityaSurveApiTest] Smart contract data:', result);

        res.json(result);
    } 
    catch (error) {
        console.error('[AdityaSurveApiTest] Error fetching contract data:', error);
        res.status(500).json({ error: 'Failed to fetch contract data' });
    }
});


    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
        app.use(express.static('client/build'));
        app.get('*', (req, res) => {
            res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
        });
    }

    // Start server
    app.listen(final_port, () => {
        console.log(`Backend running on http://localhost:${final_port}`);
    });
})();