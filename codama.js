import { createCodamaConfig } from "gill";

export default createCodamaConfig({
  idl: "target/idl/escrow_testing.json",
  clientJs: "clients/js/src/generated",
});
