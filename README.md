# brokernomex - Advanced Trading Automation Platform

A sophisticated full-stack trading platform that enables automated strategy execution across multiple brokerages with advanced risk management and analytics.

## 🚀 Features

### Frontend (React + TypeScript)
- **Modern Dashboard** - Real-time portfolio tracking with beautiful visualizations
- **Multi-Brokerage Integration** - Connect Alpaca, IBKR, Binance, and more
- **Strategy Management** - Configure and backtest trading strategies
- **Options Analytics** - Advanced options chain visualization and risk metrics
- **Responsive Design** - Optimized for desktop trading workstations
- **Smooth Animations** - Framer Motion powered micro-interactions

### Backend (Python FastAPI)
- **RESTful API** - Clean, documented endpoints for all functionality
- **Real-time Data** - Market data integration with multiple providers
- **Strategy Engine** - Backtesting and live strategy execution
- **Risk Management** - Advanced position sizing and risk controls
- **Secure Authentication** - Supabase integration with 2FA support

### Key Capabilities
- **Portfolio Consolidation** - Unified view across stocks, crypto, IRAs, forex
- **Automated Trading** - Rule-based strategy execution
- **Advanced Analytics** - P&L tracking, performance metrics, risk analysis
- **Subscription Tiers** - Stripe-powered monetization with tiered features
- **Backtesting Engine** - Historical strategy validation

## 🛠 Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for fast development
- TailwindCSS for styling
- Framer Motion for animations
- Zustand for state management
- Recharts for data visualization

**Backend:**
- Python FastAPI
- Supabase for database & auth
- Stripe for payments
- Real-time WebSocket support

**Integrations:**
- Alpaca Markets API
- Interactive Brokers API
- Binance API
- Polygon.io market data
- Stripe payments

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account
- Stripe account (for payments)

### Frontend Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Add your Supabase and Stripe keys to .env
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_anon_key
# VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key

# Start development server
npm run dev
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the API server
python run.py
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:6853`.

## 📊 Architecture

### Database Schema (Supabase)
- **users** - User profiles and subscription info
- **brokerage_accounts** - Connected trading accounts
- **trading_strategies** - Strategy configurations
- **trades** - Trade execution history
- **backtests** - Historical strategy performance

### API Endpoints
- `GET /api/portfolio` - Portfolio overview
- `GET /api/strategies` - Trading strategies
- `GET /api/trades` - Trade history
- `POST /api/backtest` - Run strategy backtests
- `POST /api/execute-trade` - Execute trades

## 💰 Subscription Tiers

### Starter ($29/month)
- Up to $10K portfolio value
- Basic strategies (covered calls, CSP)
- Email support
- 1 connected brokerage

### Pro ($99/month)
- Up to $100K portfolio value
- Advanced strategies
- Priority support
- 3 connected brokerages
- Backtesting & analytics

### Performance ($299/month)
- Unlimited portfolio value
- All strategies + custom
- White-glove support
- Unlimited brokerages
- AI optimization

## 🔮 Roadmap

### Phase 1 (Current)
- [x] Core dashboard and authentication
- [x] Basic portfolio tracking
- [x] Strategy configuration UI
- [ ] Real brokerage API integration
- [ ] Basic backtesting engine

### Phase 2
- [ ] Advanced options analytics
- [ ] Real-time trade execution
- [ ] Performance analytics
- [ ] Mobile-responsive design

### Phase 3
- [ ] AI-powered strategy optimization
- [ ] Social strategy marketplace
- [ ] Advanced risk management
- [ ] Multi-asset support

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines and code of conduct.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This software is for educational and research purposes. Trading involves substantial risk of loss. Past performance does not guarantee future results. Always consult with a qualified financial advisor before making investment decisions.

Updated Aug 13# ncsu_brokernomex
# ncsu_brokernomex
