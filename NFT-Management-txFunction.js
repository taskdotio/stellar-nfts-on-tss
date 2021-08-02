module.exports = (body) => {
  const { TransactionBuilder, Networks, BASE_FEE, Operation, Asset, Account } = StellarBase //add server?? would need StellarSDK
  const { walletAddr, nftCode, nftIssuer, price, quantity } = body
 
  // Oder book check if an asset is available on the exchange
  let server = new StellarSdk.Server(HORIZON_URL);
  var buyingAsset = new Asset(nftCode, nftIssuer);
  var sellingAsset = Asset.native();
  let orderbook = server.orderbook(sellingAsset, buyingAsset).call();
  var bids = orderbook.bids;
  var orderFill = false;
  
  if (bids[0] == '' || bids[0] === "undefined") {
    throw {message: "Nothing exists for the requested NFT"};
  } else {
    for (bid in bids) {
      var bidPrice = bids[bid].price;
      // var bidAmount = bids[bid].amount;
      // Check to see if the price and amount are a direct match
      if (bidPrice === price) {
        orderFill = true;
        break;
      }
    }
  }

  // Checking the interger value of the quantity
  var remainder = quantity % 1
  if (remainder !== 0 ) {
    throw {message: 'Amount must be an integer value i.e. 1 or 3 etc.'};
  } else if (quantity < 1) {
    throw {message: 'Please enter a number that is greater than one'};
  }

  // Pulling in royalty values from the issuing account. 
  // Requires a standard convention to be implemented i.e. royalty_{$amount}% 
  
  var operations = [];
  var count = 0;
  fetch(`https://horizon-testnet.stellar.org/accounts/${nftIssuer}`)
  .then((res) => {
  if (res.ok)
    return res.json()
  throw res
  })
  .then((issuer) => {
    var data = issuer.data
    if (data != '' || data !== "undefined") {
      for (royalties in data) {
          var value = royalties.split("_")[1].split("%")[0]; //requires that data is inputed in a royalty_x% format
          value = value / 100;
          var royaltyValue = value * price;
          var amount = parseFloat(royaltyValue).toFixed(7);

          var buff = new Buffer(data[royalties], 'base64');
          var royaltyDestination = buff.toString();

          operations[count] = Operation.payment({
          destination: royaltyDestination,
          asset: Asset.native(),
          amount: amount
          })
          count++;
          
      }
    }
  })

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

    // Only adds the payments of the royalties based on the payment information stored in
    // the issuing account and only if there are bids that satisfy the purchasing price.
    if (orderFill) {
      // Add the royalty payments to the transaction
      for (i = 0; i < operations.length; i++) {
        transaction.addOperation(operations[i]);
      }
      
    }
    
    transaction.addOperation(operation.manageBuyOffer({
            selling: sellingAsset,
            buying: buyingAsset,
            buyAmount: quantity,
            price: price
          }))
    .setTimeout(0)
    .build()
    .toXDR()
  }
    
  )
}