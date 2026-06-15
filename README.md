# CampusFix - Decentralized Facility Reporting DApp

Link Video Presentation
https://drive.google.com/file/d/1zhMIXB9YwHLMI3ROE7DLSSotoyaofOkf/view?usp=sharing

CampusFix is a decentralized application (DApp) designed for reporting and tracking facility issues on campus (e.g., broken AC, leaking pipes, wifi outage). It leverages blockchain technology to ensure that all reports and their statuses are transparent, immutable, and cannot be tampered with by any party. 

The application utilizes a purely on-chain state architecture. No traditional databases or backend servers are used.

## 🌟 Key Features

- **Immutable Reporting:** Anyone can submit a facility issue report directly to the blockchain.
- **Admin Role Management:** The deployer of the smart contract automatically becomes the `Admin`. Only the admin has the authority to assign technicians and update the status of reports.
- **Real-time Status Tracking:** Reports progress through transparent states (`Reported` ➔ `In Progress` ➔ `Resolved`).
- **Decentralized Storage Approach:** Uses off-chain photo URLs (e.g., IPFS or Cloudinary URLs) stored on-chain to save gas while retaining visual proof.
- **Modern & Responsive UI:** Built with React, Tailwind CSS, and styled with premium glassmorphism aesthetics.

## 🛠 Tech Stack

- **Smart Contract:** Solidity (^0.8.20), Hardhat
- **Frontend:** React.js (Vite), Tailwind CSS, Lucide Icons
- **Web3 Integration:** ethers.js (v6)

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [MetaMask](https://metamask.io/) extension installed in your browser.

---

## 🚀 Installation & Setup

### 1. Clone the Repository
*(If you haven't already)*
```bash
git clone <your-repo-url>
cd blockchain
```

### 2. Setup the Smart Contract (Hardhat)

Open a terminal and navigate to the `hardhat` directory:

```bash
cd hardhat
npm install
```

Compile the smart contract:
```bash
npx hardhat compile
```

Start the local Hardhat node (this will provide you with 20 local test accounts):
```bash
npx hardhat node
```

Open a **new terminal tab/window**, navigate to the `hardhat` folder again, and deploy the contract to your local network:
```bash
cd hardhat
npx hardhat run scripts/deploy.js --network localhost
```
*Note the deployed contract address printed in the console.*

### 3. Setup the Frontend

Open a **third terminal tab/window** and navigate to the `frontend` directory:

```bash
cd frontend
npm install
```

Update the Contract Address:
Open `frontend/src/blockchain.js` and ensure the `CONTRACT_ADDRESS` matches the address you got from deploying your contract in the previous step.

Start the development server:
```bash
npm run dev
```

The app should now be running at `http://localhost:5173` (or the port specified by Vite).

---

## 💡 Usage Guide

### Connecting MetaMask
1. Open your browser and navigate to the local React app.
2. Click **Connect Wallet** in the top right corner.
3. Make sure your MetaMask is connected to the **Localhost 8545** network (Chain ID: 1337 or 31337).
4. Import one of the private keys provided by the `npx hardhat node` terminal into MetaMask to test. The first account is the **Admin** (deployer).

### Submitting a Report (Any User)
1. Fill out the "Location", "Issue Type", and "Photo URL" fields.
2. Click **Submit Report** and confirm the transaction in MetaMask.
3. Once the block is mined, the report will appear in the dashboard.

### Managing Reports (Admin Only)
1. Switch your MetaMask account to the **Deployer Account** (Account #0 from Hardhat).
2. The UI will automatically display an `Admin` badge in the header.
3. You will now see additional controls on each report card:
   - **Assign Technician:** Type a name and click "Assign" to dispatch a technician.
   - **Status Dropdown:** Change the status to "In Progress" or "Resolved".

---

## 📁 Project Structure

```
├── hardhat/                    # Smart Contract Environment
│   ├── contracts/
│   │   └── FacilityReport.sol  # Main logic contract
│   ├── scripts/
│   │   └── deploy.js           # Deployment script
│   └── hardhat.config.js       # Hardhat configuration
│
└── frontend/                   # React Web Application
    ├── src/
    │   ├── App.jsx             # Main UI component & state
    │   ├── blockchain.js       # ethers.js utilities & setup
    │   ├── FacilityReport.json # Compiled ABI JSON
    │   └── index.css           # Tailwind & Global styles
    ├── tailwind.config.js      # Tailwind UI configuration
    └── package.json
```

## 📜 License
This project is licensed under the MIT License.
