package manualtest

import (
	"bri-3/hcs"
	"bri-3/models"

	"github.com/hashgraph/hedera-sdk-go"
)

func main() {
	hederaClient := hedera.ClientForTestnet()
	prKey, err := hedera.PrivateKeyFromString("302e020100300506032b657004220420c49c87524b1944a142b58d511f7b094ba7d9d2e1cdd1a9d2c6f3fdcca74ae736")
	hederaClient.SetEmptyOperator()

	message := []byte{0x01, 0x02, 0x03}

	workgroup := hcs.NewWorkgroup(hederaClient)
	signer, err := models.NewTransactionSigner("0.0.4266", "302a300506032b6570032100424d2b3f9ec5d189bf24515ced88cdef28725b2fa32eb31023c551c56eb76f2f")

	err = workgroup.SubmitMessageAndBroadcast(
		signer,
		prKey.String(),
		"0.0.269841",
		message,
		"Test message",
		1,
	)

	if err != nil {
		panic(err)
	}
}