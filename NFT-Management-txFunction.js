const { TransactionBuilder, Networks, BASE_FEE, Operation, Asset, Account, Server } = require ('stellar-sdk') //add server?? would need StellarSDK
const fetch = require('node-fetch')
const { walletAddr, nftCode, nftIssuer, price, quantity } = body
 
processNFT();

async function processNFT() {
  console.log("here");
  // Checking the interger value of the quantity
  var remainder = quantity % 1
  if (remainder !== 0 ) {
      throw {message: 'Amount must be an integer value i.e. 1 or 3 etc.'};
  } else if (quantity < 1) {
      throw {message: 'Please enter a number that is greater than one'};
  }
  
  console.log(1);
  await orderbookCheck();  
  console.log(2);
  //let royalties = await createRoyalties();
  console.log(3)
  return buildTransaction(royalties); 

}

async function orderbookCheck() {
  // Order book check to determine if an asset is available on the exchange
  let server = new Server("https://horizon-testnet.stellar.org");
  // Sets the buying asset as an 

  orderbook = await server.orderbook(sellingAsset, buyingAsset).call();
  var bids = orderbook.bids;

  if (bids[0] == '' || bids[0] === "undefined") {
  throw {message: "Nothing exists for the requested NFT"};
  } else {
      for (bid in bids) {
          var bidPrice = bids[bid].price_r.d.toString();

          // Check to see if the price and amount are a direct match
          if (bidPrice == price) {
              break;
          }
      }
  }
}

// Returns an array of operations to be added to the final transaction
function createRoyalties() {
  info = fetch(`https://horizon-testnet.stellar.org/accounts/${nftIssuer}`)
  const response = info.json();
  var data = response.data;
  
  keys = Object.keys(data);
  var royaltyKeys = [];
  var royaltyPayments = [];
  var initAddr = Buffer.from(data["nft_initial_account_holder"], 'base64').toString();
  
  if (initAddr == walletAddr) {
      var initialRoyalties = true; 
  } else {
      var ongoingRoyalties = true;
  }
      // Loops through all of the keys and determines if they are initial or ongoing royalties, will filter out 
      // according to what is required
      for (key in keys) {
          var text = keys[key].split("_");
          console.log(text.length)
          if (text.length > 2 && initialRoyalties && text[3] == "initial"){
              royaltyKeys.push(keys[key])
              
          } else if (text.length > 2 && ongoingRoyalties && text[3] == "ongoing"){
              royaltyKeys.push(keys[key])
          }
      }
      
      // Build the transactions for the royalties 
      for (i = 0; i < royaltyKeys.length; i++) {
          var percent = royaltyKeys[i].split("_")[2]/100;
          var paymentPrice = parseFloat(price * percent).toFixed(7);

          var paymentAddr = Buffer.from(data[royaltyKeys[i]], 'base64').toString()
          console.log(paymentPrice);
          var royaltyOp = Operation.payment({
                              destination: paymentAddr,
                              asset: Asset.native(),
                              amount: paymentPrice
                              });
          royaltyPayments.push(royaltyOp);
      }
      
  return royaltyPayments;
}
  
async function buildTransaction(royaltyPayments) {
  // Build the transaction of the NFT with the royalties added if applicable
  return await fetch(`https://horizon-testnet.stellar.org/accounts/${walletAddr}`)
  .then((res) => {
      if (res.ok)
          return res.json()
      throw res
  })

  .then((account) => {

      var transaction = new TransactionBuilder(
          new Account(account.id, account.sequence), 
              { 
                  fee: BASE_FEE, 
                  networkPassphrase: Networks.TESTNET,
              }
      )

      // Only adds the payments of the royalties based on the payment information stored in
      // the issuing account and only if there are bids that satisfy the purchasing price.

      // Set the trustline flags to allow full authority
      transaction.addOperation(Operation.setTrustLineFlags({
              trustor: walletAddr,
              asset: buyingAsset,
              flags: {
              authorized: true
              }
              }))

      // Add the selling operations of the transaction
      transaction.addOperation(Operation.manageBuyOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              buyAmount: quantity,
              price: price,
              offerId: 0
              }))

      // Removing full authorisation and adding only authorisation to maintain liabilities.
      transaction.addOperation(Operation.setTrustLineFlags({
              trustor: walletAddr,
              asset: buyingAsset,
              flags: {
              authorized: false,
              authorizedToMaintainLiabilities: true
              }
              }));

      // Add the royalty payments to the transaction
      for (i = 0; i < royaltyPayments.length; i++) {
          transaction.addOperation(royaltyPayments[i]);
      }

      transaction.setTimeout(0)
      .build()
      .toXDR()
  }

  )
}