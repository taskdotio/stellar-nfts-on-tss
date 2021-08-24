module.exports = (body) => {
  const { TransactionBuilder, Networks, BASE_FEE, Operation, Asset, Account } = require("stellar-sdk")
  const fetch = require("node-fetch")
  const { walletAddr, nftCode, nftIssuer, price, quantity } = body

  // Hash as of 11 of August 7:22pm AEST
  // Signer: GCKDDO76XQXCMBC7AGH5DLLB2UCYHMHPQD4YPHGHGYQBL72OUIOMHMWU

  // Set up the selling asset as well as the buying asset
  var sellingAsset = new Asset(nftCode, nftIssuer);
  var buyingAsset = Asset.native();

  price = parseFloat(price).toFixed(7);
  quantity = parseFloat(quantity).toFixed(7);

  // Checking the interger value of the quantity
  var remainder = quantity % 1
  if (remainder !== 0 ) {
    throw {message: 'Amount must be an integer value i.e. 1 or 3 etc.'};
  } else if (quantity < 1) {
    throw {message: 'Please enter a number that is greater than one'};
  }
  
  // Build the transaction of the NFT with the royalties added if applicable
  return fetch(`https://horizon-testnet.stellar.org/accounts/${walletAddr}`)
  .then((res) => {
    if (res.ok)
      return res.json()
    throw res
  })
  
  .then((account) => {

    new TransactionBuilder(
      new Account(account.id, account.sequence), 
      { 
        fee: BASE_FEE, 
        networkPassphrase: Networks.TESTNET,
      }
    )
   
    // Authorise the account to have full authority with the asset
    .addOperation(Operation.setTrustLineFlags({
      trustor: walletAddr,
      asset: sellingAsset,
      flags: {authorized:true}
    }))

    // Add the selling operations of the transaction
    .addOperation(Operation.manageSellOffer({
        selling: sellingAsset,
        buying: buyingAsset,
        amount: quantity,
        price: price,
        offerId: "0"
      }))
    
    // Remove full authority and only authorise to maintain liabilities
    .addOperation(Operation.setTrustLineFlags({
        trustor: walletAddr,
        asset: sellingAsset,
        flags: {authorized: false,
                authorizedToMaintainLiabilities: true}
      }))
    .setTimeout(0)
    .build()
    .toXDR()
  } 
  )
}