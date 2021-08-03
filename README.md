# Stellar NFTs on TSS

Thge goal of Stellar NFTs on TSS is to simplify the trading of NFTs while also simplifying how NFTs are displayed within Stellar wallets. Currently the way in which NFTs are viewed in the wallets means that they are viewed as a stroop, and each stroop represents one NFT. Part of the goal of NFTs on TSS is to simplify this and have one whole NFT represents one NFT. To achieve this a txFunction (smart contract) has been created to manage the trading of NFTs to ensure that they remain one hole NFT and are not mutable or split.

The txFunction manageNFT.js has been created to allow for the manged trade to be exectued and only allow for the trade of whole NFTs. The txFunction achieves this  in three sections. The txFunction can be deployed to any Turret that is running the latest TSS protocol version, it requires that the user or application making a call to the txFunction make a call with the following parametres. 

`walletAddr` is the address that is linked to the wallet, essentially the address of the buyer of the NFT.  

`nftCode` The nftCode is simply the code of the NFT whether that be a 4 character Alphanumeric or a 12 character Alphanumeric code. 

`nftIssuer` is the issuing address associated with the NFT.

`price` is the desired price for the NFT.

`quantity` is the number of NFT's that wish to be purchased.

The first segment of the txFunction will verify if there is an existing order that exists for the NFT code that has been passed to the txFunction. If an order does not exist than the txFunction will throw a message and cease operation, stating that "Nothing exists for the requested NFT". If there exists an order that matches the proposed price passed to the txFunction, then the txFunction will set a flag continuing the trade of the NFT.

A major part of the NFT-Management-txFunction is the ability to pay royalties to different parties based on a percentage. These royalties are written into the issuing account as a data key, it is important that the royalties are inputted into the manage data operation in a particular format. `royalty_{$amount}%` is the format of the key of the manage data operation, where $amount is the percentage amount of price that is to be paid to a particular Stellar account.


## Limitations of the txFunction

Currently the txFunction requires that the NFT trade is made using a native selling asset. This could be easily changed in the future to enable the use of other assets being traded. However, for ease of filling orders and trading NFTs utilising native assets was the easiest and most efficient way. 


