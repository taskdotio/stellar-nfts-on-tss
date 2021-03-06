/* 
    This txFunction manages the buying of NFTs by:
    - Check that a sell order exists in the order book
    - Checks the NFT issuer for royalty payments
    - We create an array of the royalty payment operations
    Finally we build a buy order transaction that includes royalty payments 
*/

const { TransactionBuilder, Networks, BASE_FEE, Operation, Asset, Account, Server, Claimant } = require ('stellar-sdk') 
const fetch = require('node-fetch')

module.exports = async (body) => {
    return processNFT(body)
}

async function processNFT(body) {
  
    const { walletAddr, nftCode, nftIssuer, price, sellingCode, sellingIssuer, quantity } = body

    // Set up the selling asset as well as the buying asset
    
    var buyingAsset = new Asset(nftCode, nftIssuer);
    
    if (sellingCode == "native") {
        var sellingAsset = Asset.native();
    } else {
        var sellingAsset = new Asset(sellingCode, sellingIssuer);
    }

    // Checks we are dealing with an integer to maintain non fungibility
    var remainder = quantity % 1
    if (remainder !== 0 ) {
        throw {message: 'Amount must be an integer value i.e. 1 or 3 etc.'};
    } else if (quantity < 1) {
        throw {message: 'Please enter a number that is greater than one'};
    }


    await orderbookCheck(sellingAsset, buyingAsset, price);  
    let royalties = await createRoyalties(nftIssuer, price, sellingAsset, sellingCode);
    return buildTransaction(walletAddr, nftIssuer, price, quantity, royalties, sellingAsset, buyingAsset); 
}

/* Run through the stellar order book and determine if there are any existing sell orders on the network.
If there is then the function will continue, otherwise it should stop all together.  */
async function orderbookCheck(sellingAsset, buyingAsset, price) {
  // Order book check to determine if an asset is available on the exchange
  let server = new Server(HORIZON_URL);
  // Sets the buying asset as an 

    orderbook = await server.orderbook(sellingAsset, buyingAsset).call();
    var bids = orderbook.bids;
    if (typeof(bids[0]) === "undefined") {
        throw {message: "Nothing exists for the requested NFT"};
    } else {
        for (bid in bids) {
            var bidPrice = bids[bid].price.toString();
            
            // Check to see if the price and amount are a direct match
            if (bidPrice == price) {
                break;
            }
        }
    }
}


/* Probes the issuer account's data and processes the royalty data that is stored and creates an array of 
royalty payments that are to be added to the final transaction.  */
async function createRoyalties(nftIssuer, price, sellingAsset, sellingCode) {

var issuerURL = HORIZON_URL + "/accounts/" + nftIssuer;
var royaltyPayments = [];

return await fetch(issuerURL)
.then((res) => {
    if (res.ok)
        return res.json()
    throw res
    })
.then((issuer) => {

    // Pulls the data in from the issuing account
    data = issuer.data        
    keys = Object.keys(data);
    var royaltyKeys = [];
    
    // Sets the boolean string for initial holder or not
    if (typeof(data["nft_initial_account_holder"]) !== "undefined") {
        
        var initAddr = Buffer.from(data["nft_initial_account_holder"], 'base64').toString();
    
    } else {
        
        var initAddr = ""
    
    }
    
    if (initAddr == "true") {
        var initialRoyalties = true;
        var dataOp = Operation.manageData({
            name: "nft_initial_account_holder",
            value: "false",
            source: nftIssuer
            });
        royaltyPayments.push(dataOp); 
    } else {
        var ongoingRoyalties = true;
    }
        /* Loops through all of the keys and determines if they are initial or ongoing royalties, will filter out 
        according to what is required */
        for (key in keys) {
            var text = keys[key].split("_");
            
            if (text.length > 2 && initialRoyalties && text[3] == "initial"){
                royaltyKeys.push(keys[key])
            } else if (text.length > 2 && ongoingRoyalties && text[3] == "ongoing"){
                royaltyKeys.push(keys[key])
            } else if (text.length > 2 && text.length < 4 && text[1] == "creator") {
                royaltyKeys.push(keys[key])
            }
        }

        //NEW REVERSE ENGINEERING
        var totalRoyaltyPercentage = 0;
        for (i =0 ; i < royaltyKeys.length; i++) {
            totalRoyaltyPercentage += parseFloat(royaltyKeys[i].split("_")[2]);
        }
        var userPercentage = 100 - totalRoyaltyPercentage;
        var pricePerPercent = price/userPercentage;
        
        // Build the transactions for the royalties 
        for (i = 0; i < royaltyKeys.length; i++) {
            var percent = royaltyKeys[i].split("_")[2];
            var paymentPrice = parseFloat(pricePerPercent * percent).toFixed(7);
            var paymentAddr = Buffer.from(data[royaltyKeys[i]], 'base64').toString()
            
            /* Checks the asset type and if native creates a payment otherwise will
            create a claimable balance to ensure there is no difficulties with
            trustlines on the receiving account. */
            if (sellingCode == 'native') {
                var royaltyOp = Operation.payment({
                    destination: paymentAddr,
                    asset: sellingAsset, 
                    amount: paymentPrice                      
                    });
                royaltyPayments.push(royaltyOp);
            } else {
                var royaltyOp = Operation.createClaimableBalance({
                    asset: sellingAsset, 
                    amount: paymentPrice,
                    claimants: [
                        new Claimant(paymentAddr)
                    ]                               
                    });
                royaltyPayments.push(royaltyOp);
            }
            
        }
        
    return royaltyPayments;
});

} 
  
// This function will pull the royalties into it and add it to the main transaction. The main transaction
// is to create a buy for the listed price that has been passed through to the contract.
async function buildTransaction(walletAddr, nftIssuer, price, quantity, royaltyPayments, sellingAsset, buyingAsset) {

    var accountURL = HORIZON_URL + "/accounts/" + walletAddr
  // Build the transaction of the NFT with the royalties added if applicable
  return await fetch(accountURL) 
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
                  networkPassphrase: Networks[STELLAR_NETWORK],
              }
      )
            
      // Set the trustline flags to allow full authority
      transaction.addOperation(Operation.setTrustLineFlags({
              trustor: walletAddr,
              asset: buyingAsset,
              flags: {
                authorized: true,
                authorizedToMaintainLiabilities: false
              },
              source: nftIssuer
      }))
      
      // Add the buying operations of the transaction
      transaction.addOperation(Operation.manageBuyOffer({
              selling: sellingAsset,
              buying: buyingAsset,
              buyAmount: quantity,
              price: price,
              offerId: 0
      }))
      
      // Removing full authorisation and adding authorisation to maintain liabilities
      transaction.addOperation(Operation.setTrustLineFlags({
              trustor: walletAddr,
              asset: buyingAsset,
              flags: {
                authorized: false,
                authorizedToMaintainLiabilities: true
              },
              source: nftIssuer
      }))
      
      // Add the royalty payments to the transaction
      var i = 0;
      while (i !== royaltyPayments.length) {
          
        var op = royaltyPayments[i];
        transaction.addOperation(op);
        i++
      }
      
      
      return transaction.setTimeout(0)
      .build()
      .toXDR()
      
  }

  )
}
