# Overview
NFTs are currently difficult to buy, sell and hold on the Stellar network. This new standard for NFTs allows for them to be managed using [Stellar’s Turing Signing Servers](https://tss.stellar.org) to facilitate the buying and selling of NFTs along with adding features. 

Use these standards to create the NFTs and manage then in compatible Stellar wallets.

# Create NFT process
This is the typical process you’ll go through to create a new NFT:
1. Gather NFT data such as name, image etc
2. Upload image to IPFS to retrieve the image CID and image URL
3. Create the new Stellar asset issuer account
4. Elect/Create distributor account, add trust line and send integer number of tokens from issuer
5. Define the Asset TOML using the new issuer details, asset information plus image URL
6. Define the NFT TOML file, upload to IPFS and record the CID
7. Update the asset with a single sandwich transaction:
	1. Define royalties via managed data
	2. Define the asset domain
	3. Add the signer turrets
	4. Lock account 

## Asset name conventions
Assets are named NFT and the issuer account is the unique identifier that is associated with the account.  This allows wallets to display NFTs in separate areas to the fungible assets.

## Defining supply
It is necessary to define the number of NFTs that are to be created at the start of the creation of the NFT. Normally this will be 1 for a single NFT, or some other integer if you are issuing more than one.

Once you complete creation of your NFT you’ll lock the account, so make sure the supply is defined.

## Asset TOML file
Example of a Asset TOML file for an NFT - this is the traditional TOML file required to [document a Stellar asset](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md):

```
[DOCUMENTATION]
ORG_URL="https://theorg.url"

[[CURRENCIES]]
code="NFT"
issuer="GCACKMQHO44XQC7JAKLDDZDUPPZH7LXUPHP7HHJ2VCTIVELSXNKOWYIJ"
name="Title of the NFT"
desc="Supporting description of the NFT"
image="https://ipfs.io/ipfs/QmRwPzCAjYRPPePykh4umGcrdRCeNuupAjqsN8NHNi2fXm"
```

## NFT TOML file
This is uploaded to IPFS, the resulting CID is stored in the asset Managed Data. Example of a NFT TOML file for an NFT:

```
{
   "name":"Title of the NFT",
   "description":"Supporting description of the NFT",
   "image":"ipfs://QmRwPzCAjYRPPePykh4umGcrdRCeNuupAjqsN8NHNi2fXm",
   "url":"https://ipfs.io/ipfs/QmRwPzCAjYRPPePykh4umGcrdRCeNuupAjqsN8NHNi2fXm",
   "code":"NFT",
"issuer":"GCACKMQHO44XQC7JAKLDDZDUPPZH7LXUPHP7HHJ2VCTIVELSXNKOWYIJ",
   "supply":5,
   "conditions":"Optional conditions depending on royalty policy defined in the txFunctions",
   "domain":"task.io/actasia",
   "author":"task.io/vetzhao",
   "publisher":"task.io/tonystark",
   "attributes" : 
  {  
        "Number of organizers 组织者人数" : "5",
        "Estimated number of animals reached" : "20~50",
        "Events photos_1" : "https://ipfs.io/ipfs/QmRwPzCAjYRPPePykh4umGcrdRCeNuupAjqsN8NHNi2fXm"
  },
}
```

### Notes on the NFT TOML file
* Domain field = initial marketplace owner of the NFT  (initial beneficiary)
* Author (optional) = profile of user who created the data
* Publisher (optional) = profile of user who created the NFT
* Attributes (optional) = key pair data additions to be stored with the NFT

## Managing royalties
Royalty payments are to be entered as a manage data entry for the issuing account. However, there are two entries that are not for royalties. They are as follows:

* ipfshash” = “<the CID linking to the NFT toml file we defined>” to the issuer account
* “nft_initial_account_holder” - the stellar address of the first “owner” to sell it, so we can determine if this is the first sale or a consecutive sale

After these two entries are added the royalties for the remaining parties that are involved with the NFT.  The following layout is how to add the royalties as a manage data keypair:

royalty_role_link_xxx%_initial_ongoing : wallet_address

The following is an example of how these royalties can be laid out:

1. royalty_author_xxx%_initial  :  wallet_address
2. royalty_author_xxx%_ongoing  :  wallet_addreess
3. royalty_publisher_xxx%_initial : wallet_address
4. royalty_publisher_xxx%_ongoing  : wallet_address
5. royalty_task_xxx%_initial : wallet_address
6. royalty_task_xxx%_ongoing : wallet_address

## Adding Turret servers as signers
The turrets that hold the txFunctions that manage the buying and selling of the NFTs need to have signing rights on the account to enable the trustlines of the asset being traded. To do so there is a list of public keys that need to be added to the issuing account as a signer.

The following public keys are to manage selling NFTs
**INSERT PUBLIC KEYS HERE**
The following public keys are to manage buying NFTs
**INSERT PUBLIC KEYS HERE**

## Locking account
Once all of the above details have been completed for the issuing account the original signing key is to be removed from the account. This then forces all transactions to be facilitated through the use of the txFunctions and the royalties that are implemented in the issuing account will be paid.

# Managing NFT assets
NFTs created using this method will be managed through two functions that run on the Stellar Turret Signing Server. The two functions are BuyNFT and SellNFT.  These functions take in the same values which are listed below.

```
Var walletAddr = "GBPDHJ6MJFCBFHABJAL75SUH627MDC4MKYY5IQJGUIWRD6YI74CYWGBW"; 
var nftCode = "NFT";
var nftIssuer ="GBRGA7JCOFLEA7W3MA33LQC3UY2QGRNWRSU2U2OQWVYKTSIC6AJWFYBA";
var price = 10.00;
var quantity = 1;
```

## Using txFunction (API calls)
The txFunctions operate through API calls and responses, there is a list of the URLs at which the txFunctions are located that the wallet can make the buy and sell calls to. To do so a POST request is made with an aut

## Authorisation Tokens
The post requests require that an authorisation token is used, this is a bearer token and can be made using the following runkit example. This token is per turret and can be set up to satisfy both the buy and sell function. It uses a claimable balance which the turret will keep track  on and claim once enough requests have been made for the functions that have been assigned to the turret. 

* Authorisation Token link: https://runkit.com/mootz12/60d1f69582e0580013bb591e
* Further Authorisation information:  https://tyvdh.github.io/stellar-tss/#section/Authentication 

# Wallet configuration
Once the authorisation token has been built then the request can be made using the following steps:

1. User selects to sell/buy an NFT.
2. The wallet takes the request and the input values as listed above and makes a POST request to the turret on behalf of the wallet.
	1. The wallet will complete this task based on how much security is determined
3. The turret sends a result of an XDR along with a signature for the transaction. 
	1. There will be multiple responses and multiple signatures based on the security level.
4. The wallet will then combine multiple signatures with the XDR that the turrets returned. 
5. The wallet will then submit the transaction with the signatures to the network along with the signature from the seller.
