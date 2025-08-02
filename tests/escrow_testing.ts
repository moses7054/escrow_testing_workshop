import { describe, it, before } from "node:test";
import assert from "node:assert";
import * as eschrowClient from "../clients/js/src/generated";
import {
  Address,
  createSolanaClient,
  createTransaction,
  generateKeyPairSigner,
  getAddressEncoder,
  getExplorerLink,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  KeyPairSigner,
  Lamports,
  signTransactionMessageWithSigners,
} from "gill";
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  buildCreateTokenTransaction,
  buildMintTokensTransaction,
  getAssociatedTokenAccountAddress,
  SYSTEM_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "gill/programs";
import { BN } from "@coral-xyz/anchor";

let maker: KeyPairSigner;
let mintA: KeyPairSigner;
let mintB: KeyPairSigner;
let makerAtaA: KeyPairSigner;
let escrow: Address;
let vault: Address;
let associatedTokenProgram: Address = ASSOCIATED_TOKEN_PROGRAM_ADDRESS;
let tokenProgram: Address = TOKEN_2022_PROGRAM_ADDRESS;
let systemProgram: Address = SYSTEM_PROGRAM_ADDRESS;
let seed: BigInt | number = 1;
let deposit: BigInt;
let receive: BigInt;
let feePayer: KeyPairSigner;
let taker: KeyPairSigner;

const { rpc, rpcSubscriptions, sendAndConfirmTransaction } = createSolanaClient(
  {
    urlOrMoniker: "localnet",
  }
);

const createSigner = async () => {
  let keyPair = await generateKeyPairSigner();
  await rpc.requestAirdrop(keyPair.address, 5_000_000_000 as any).send();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("Keypair generated");
  return keyPair;
};

const createMint = async (
  signer: KeyPairSigner,
  mint: KeyPairSigner,
  name: string
) => {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const tx = await buildCreateTokenTransaction({
    feePayer: signer,
    latestBlockhash,
    mintAuthority: signer,
    mint: mint,
    decimals: 10,
    metadata: {
      name: name,
      symbol: "TEST",
      uri: "https://example.com/metadata.json",
      isMutable: true,
    },
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

    const signedTransaction = await signTransactionMessageWithSigners(tx);

    // Get the transaction signature
    const signature = getSignatureFromTransaction(signedTransaction);

    // Log the Solana Explorer link for the transaction
    console.log('Transaction Explorer Link:', getExplorerLink({ transaction: signature }));

    // Send and confirm the transaction
    await sendAndConfirmTransaction(signedTransaction);

    console.log('Mint account created successfully!');
    console.log('Mint Address:', mint.address);
  
};

const mintTokens = async (
  feePayer: KeyPairSigner,
  mint: Address,
  mintAuthority: KeyPairSigner,
  destinationOwner: Address,
  amount: number
) => {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const tx = await buildMintTokensTransaction({
    feePayer,
    version: "legacy",
    amount: 10 * amount,
    latestBlockhash,
    mint: mint,
    mintAuthority,
    destination: destinationOwner,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });

  const signedTransaction = await signTransactionMessageWithSigners(tx);
  console.log(
    "Explorer:",
    getExplorerLink({
      cluster: "localhost",
      transaction: getSignatureFromTransaction(signedTransaction),
    })
  );
  await sendAndConfirmTransaction(signedTransaction);
};

describe("escrow_testing", () => {
  before(async () => {
    feePayer = await createSigner();
    maker = await createSigner();
    taker = await createSigner();

    mintA = await generateKeyPairSigner();
    mintB = await generateKeyPairSigner();

    await createMint(feePayer, mintA, "Mint A");
    await createMint(feePayer, mintB, "Mint B");

    await mintTokens(feePayer, mintA.address, feePayer, maker.address, 10);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });


  it("make", async () => {
    const expectedMakerAta = await getAssociatedTokenAccountAddress(
      mintA.address,
      maker.address,
      TOKEN_2022_PROGRAM_ADDRESS
    );

    const seedBN = new BN(seed)
    const seedBytes = seedBN.toArray('le', 8);
    const addressEncoder = getAddressEncoder();
    const [escrowPDA, _bump] = await getProgramDerivedAddress({
      programAddress: eschrowClient.ESCROW_TESTING_PROGRAM_ADDRESS,
      seeds: [
        Buffer.from("escrow"),
        addressEncoder.encode(maker.address),
        seedBytes,
      ]
    })

    const vault = await getAssociatedTokenAccountAddress(
      mintA.address, 
      escrowPDA, 
      tokenProgram
    );

    const params = {
      maker: maker,
      mintA: mintA.address,
      mintB: mintB.address,
      makerAtaA: expectedMakerAta,
      escrow: escrowPDA,
      vault: vault,
      tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
      seed: 1,
      deposit: 1,
      receive: 1,
    };

    const ix = eschrowClient.getMakeInstruction(params);

    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const tx = createTransaction({
      feePayer: maker,
      version: "legacy",
      instructions: [ix],
      latestBlockhash,
    });

    const signedTransaction = await signTransactionMessageWithSigners(tx);

    console.log(
      "Explorer:",
      getExplorerLink({
        cluster: "localnet",
        transaction: getSignatureFromTransaction(signedTransaction),
      })
    );
    await sendAndConfirmTransaction(signedTransaction);
  });
  it("take", async () => {});
});
