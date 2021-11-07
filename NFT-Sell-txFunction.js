// This txFunction creates a sell order for an NFT asset. Uses walletAddr, nftCode, nftIssuer, price, quantity
// input variables - and checks for integers to protect nonfungibility.

const { TransactionBuilder, Networks, BASE_FEE, Operation, Asset, Account } = require("stellar-sdk");
const fetch = require("node-fetch");

module.exports = async (body) => {
  const { walletAddr, nftCode, nftIssuer, price, quantity } = body

  // Set up the selling asset as well as the buying asset
  var sellingAsset = new Asset(nftCode, nftIssuer);
  var buyingAsset = Asset.native();

  // Variable Horizon URL
  var sellingURL = HORIZON_URL + "/accounts/" + walletAddr;

  newPrice = parseFloat(price).toFixed(7);
  newQuantity = parseFloat(quantity).toFixed(0);

  // Make sure we are using integer sale value to protect nonfungible integrity
  var remainder = quantity % 1
  
  if (remainder !== 0 ) {
    throw {message: 'Amount must be an integer value i.e. 1 or 3 etc.'};
  } else if (quantity < 1) {
    throw {message: 'Please enter a number that is greater than one'};
  }
    
  // Build the transaction of the NFT
  return fetch(sellingURL)
  .then((res) => {
    if (res.ok)
      return res.json()
    throw res
  })
  
  .then((account) =>
    new TransactionBuilder(
      new Account(account.id, account.sequence), 
      { 
        fee: BASE_FEE, 
        networkPassphrase: Networks[STELLAR_NETWORK],
      }
    )
   
    // Authorise the account to have full authority with the asset
    .addOperation(Operation.setTrustLineFlags({
      trustor: walletAddr,
      asset: sellingAsset,
      flags: {
        authorized:true,
        authorizedToMaintainLiabilities: false
      },
      source: nftIssuer
    }))

    // Add the selling operations of the transaction
    .addOperation(Operation.manageSellOffer({
      selling: sellingAsset,
      buying: buyingAsset,
      amount: newQuantity,
      price: newPrice,
      offerId: "0"
    }))
    
    // Remove full authority and only authorise to maintain liabilities
    .addOperation(Operation.setTrustLineFlags({
      trustor: walletAddr,
      asset: sellingAsset,
      flags: {
        authorized: false,
        authorizedToMaintainLiabilities: true
      },
      source: nftIssuer
    }))
    .setTimeout(0)
    .build()
    .toXDR()
  )
}
