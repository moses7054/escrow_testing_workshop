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

let maker: KeyPairSigner;
let mintA: KeyPairSigner;
let mintB: KeyPairSigner;
let makerAtaA: Address;
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
let programId: Address = eschrowClient.ESCROW_TESTING_PROGRAM_ADDRESS;

type makeParams = Parameters<typeof eschrowClient.getMakeInstruction>[0];

const { rpc, sendAndConfirmTransaction } = createSolanaClient({
	urlOrMoniker: "localnet",
});

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
	await sendAndConfirmTransaction(signedTransaction);
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
		amount: amount * 1e10,
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
	});
	it("make", async () => {
		makerAtaA = await getAssociatedTokenAccountAddress(
			mintA.address,
			maker.address,
			TOKEN_2022_PROGRAM_ADDRESS
		);

		const buffer = Buffer.alloc(8);
		buffer.writeBigUInt64LE(BigInt(seed), 0);

		[escrow] = await getProgramDerivedAddress({
			programAddress: programId,
			seeds: [
				"escrow",
				getAddressEncoder().encode(maker.address),
				buffer,
			],
		});

		vault = await getAssociatedTokenAccountAddress(
			mintA.address,
			escrow,
			TOKEN_2022_PROGRAM_ADDRESS
		);

		const params: makeParams = {
			maker: maker,
			mintA: mintA.address,
			mintB: mintB.address,
			makerAtaA: makerAtaA,
			deposit: 1,
			receive: 1,
			seed: seed,
			escrow: escrow,
			vault: vault,
			associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
			systemProgram: SYSTEM_PROGRAM_ADDRESS,
			tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
		};

		const ix = eschrowClient.getMakeInstruction(params);

		const { value: latestBlockhash } = await rpc
			.getLatestBlockhash()
			.send();
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
