module.exports = (body) => {
  const { TransactionBuilder, Networks, BASE_FEE, Operation, Asset, Account } = StellarSdk //add server?? would need StellarSDK
  const { walletAddr, nftCode, nftIssuer, price, quantity } = body

  // Set up the selling asset as well as the buying asset
  sellingAsset = new Asset(nftCode, nftIssuer);
  buyingAsset = Asset.Native();

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

    var transaction = new TransactionBuilder(
      new Account(account.id, account.sequence), 
      { 
        fee: BASE_FEE, 
        networkPassphrase: Networks.TESTNET,
      }
    )
   
    // Authorise the account to have full authority with the asset
    transaction.addOperation(Operation.setTrustlineFlags({
      trustor: walletAddr,
      asset: sellingAsset,
      flags: {
        authorized: true
      }
    }));

    // Add the selling operations of the transaction
    transaction.addOperation(Operation.manageSellOffer({
            selling: sellingAsset,
            buying: buyingAsset,
            buyAmount: quantity,
            price: price
          }));

    // Remove the authorisation and allowing the account to only maintain liabilites. ]
    transaction.addOperation(Operation.setTrustlineFlags({
      trustor: walletAddr,
      asset: sellingAsset,
      flags: {
        authorized: false,
        authorizedToMaintainLiabilities: true
      }
    }
    ))
    .setTimeout(0)
    .build()
    .toXDR()
  } 
  )
}