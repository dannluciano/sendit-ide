describe("SendIT IDE title", () => {
  it("Get Correct SendIT IDE title", () => {
    cy.request("http://localhost:8001/version");

    // cy.body().should("eq", "v0.0.1");
  });
});
