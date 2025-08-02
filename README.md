# Escrow Testing

**Work in Progress** 🚧

This is an experimental Solana escrow smart contract built with the Anchor framework. The project demonstrates an escrow mechanism where a maker can deposit tokens and a taker can fulfill the escrow by providing the requested tokens.

## Technology Stack

- **Anchor Framework**: For Solana smart contract development
- **Codama**: Used for generating TypeScript client code from the Anchor IDL
- **Gill**: Modern Solana web3 library used for testing and client interactions
- **TypeScript**: For testing and client development

## Project Structure

```
escrow_testing/
├── programs/escrow_testing/     # Rust smart contract source code
├── clients/js/src/generated/    # Generated TypeScript client (via Codama)
├── tests/                       # Test files using Gill
├── app/                         # Frontend application
└── migrations/                  # Deployment scripts
```

## Branches

- **`master`**: Contains a test that is falling
- **`test`**: Contains a somewhat passing test (experimental features)

## Smart Contract Features

The escrow contract includes the following instructions:

- `make`: Create an escrow with deposit and receive amounts
- `take`: Fulfill an escrow by providing the requested tokens
- `refund`: Cancel an escrow and return deposited tokens

## Getting Started

### Prerequisites

- Rust and Cargo
- Solana CLI tools
- Anchor CLI
- Node.js and npm/yarn

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Build the smart contract:

   ```bash
   anchor build
   ```

4. Deploy to localnet:
   ```bash
   anchor deploy
   ```

### Running Tests

The tests use Gill for Solana interactions and are written in TypeScript:

```bash
anchor test --skip-local-validator
```

## Development Status

This project is actively being developed and tested. The smart contract implementation and testing framework are experimental and subject to change.

## Generated Client

The TypeScript client code in `clients/js/src/generated/` is automatically generated using Codama from the Anchor IDL. This provides type-safe interactions with the smart contract.

## Contributing

This is a testing and learning project. Feel free to experiment with different approaches and improvements.
