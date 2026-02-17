import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Minimal ABI for a simple hash storage contract
// We'll use raw transactions to store data on-chain via tx input data
const POLYGON_RPC_URL = Deno.env.get("POLYGON_RPC_URL") || "https://rpc-amoy.polygon.technology";
const POLYGON_PRIVATE_KEY = Deno.env.get("POLYGON_PRIVATE_KEY") || "";

async function getChainId(): Promise<string> {
  const res = await fetch(POLYGON_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
  });
  const json = await res.json();
  return json.result;
}

async function getNonce(address: string): Promise<string> {
  const res = await fetch(POLYGON_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionCount", params: [address, "latest"], id: 1 }),
  });
  const json = await res.json();
  return json.result;
}

async function getGasPrice(): Promise<string> {
  const res = await fetch(POLYGON_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 1 }),
  });
  const json = await res.json();
  return json.result;
}

async function sendRawTransaction(signedTx: string): Promise<string> {
  const res = await fetch(POLYGON_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_sendRawTransaction", params: [signedTx], id: 1 }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function getTransactionByHash(txHash: string): Promise<any> {
  const res = await fetch(POLYGON_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getTransactionByHash", params: [txHash], id: 1 }),
  });
  const json = await res.json();
  return json.result;
}

// Simple secp256k1 signing using Web Crypto + manual RLP encoding
// We use a self-to-self transaction with the hash in the data field

function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith("0x")) hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function numberToHex(n: number | bigint): string {
  if (n === 0 || n === 0n) return "0x";
  const hex = n.toString(16);
  return hex.length % 2 === 0 ? `0x${hex}` : `0x0${hex}`;
}

// RLP encoding
function rlpEncodeLength(len: number, offset: number): Uint8Array {
  if (len < 56) {
    return new Uint8Array([len + offset]);
  }
  const hexLen = len.toString(16);
  const lenBytes = hexToBytes(hexLen.length % 2 === 0 ? hexLen : "0" + hexLen);
  return new Uint8Array([offset + 55 + lenBytes.length, ...lenBytes]);
}

function rlpEncodeItem(item: Uint8Array): Uint8Array {
  if (item.length === 1 && item[0] < 0x80) {
    return item;
  }
  if (item.length === 0) {
    return new Uint8Array([0x80]);
  }
  const prefix = rlpEncodeLength(item.length, 0x80);
  const result = new Uint8Array(prefix.length + item.length);
  result.set(prefix);
  result.set(item, prefix.length);
  return result;
}

function rlpEncodeList(items: Uint8Array[]): Uint8Array {
  let totalLen = 0;
  const encoded = items.map(i => rlpEncodeItem(i));
  encoded.forEach(e => totalLen += e.length);
  const prefix = rlpEncodeLength(totalLen, 0xc0);
  const result = new Uint8Array(prefix.length + totalLen);
  result.set(prefix);
  let offset = prefix.length;
  encoded.forEach(e => { result.set(e, offset); offset += e.length; });
  return result;
}

function stripLeadingZeros(bytes: Uint8Array): Uint8Array {
  let i = 0;
  while (i < bytes.length - 1 && bytes[i] === 0) i++;
  return bytes.slice(i);
}

// Import private key for signing
async function importPrivateKey(hexKey: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(hexKey);
  // We need to use the key with ECDSA P-256... but Ethereum uses secp256k1
  // Web Crypto doesn't support secp256k1, so we'll use a different approach
  // We'll compute the address from the private key using a simple method
  throw new Error("Web Crypto doesn't support secp256k1");
}

// Since Web Crypto doesn't support secp256k1, we'll use a pure Deno approach
// by importing a lightweight library
async function storeHashOnChain(certificateHash: string): Promise<{ txHash: string; from: string }> {
  // Dynamic import of ethers from esm.sh
  const { ethers } = await import("https://esm.sh/ethers@6.13.4");
  
  if (!POLYGON_PRIVATE_KEY) {
    throw new Error("POLYGON_PRIVATE_KEY not configured");
  }

  const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(POLYGON_PRIVATE_KEY, provider);
  
  // Store the certificate hash as transaction data (self-to-self tx)
  // Prefix with "AXON:" for identification
  const dataHex = ethers.hexlify(ethers.toUtf8Bytes(`AXON:CERT:${certificateHash}`));
  
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0,
    data: dataHex,
  });

  return { txHash: tx.hash, from: wallet.address };
}

async function verifyHashOnChain(txHash: string, expectedHash: string): Promise<{ verified: boolean; data?: string }> {
  const { ethers } = await import("https://esm.sh/ethers@6.13.4");
  
  const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
  const tx = await provider.getTransaction(txHash);
  
  if (!tx) {
    return { verified: false };
  }

  const decodedData = ethers.toUtf8String(tx.data);
  const expectedData = `AXON:CERT:${expectedHash}`;
  
  return { 
    verified: decodedData === expectedData,
    data: decodedData 
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, certificate_hash, tx_hash } = await req.json();

    if (action === "store") {
      // Store certificate hash on Polygon
      if (!certificate_hash) {
        return new Response(
          JSON.stringify({ error: "certificate_hash is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await storeHashOnChain(certificate_hash);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          tx_hash: result.txHash,
          from: result.from,
          network: "Polygon Amoy Testnet",
          explorer: `https://amoy.polygonscan.com/tx/${result.txHash}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      // Verify certificate hash against on-chain data
      if (!tx_hash || !certificate_hash) {
        return new Response(
          JSON.stringify({ error: "tx_hash and certificate_hash are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await verifyHashOnChain(tx_hash, certificate_hash);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: result.verified,
          on_chain_data: result.data,
          network: "Polygon Amoy Testnet"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'store' or 'verify'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Polygon certificate error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
