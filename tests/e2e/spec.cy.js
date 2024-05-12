describe("SendIT IDE title", () => {
  it("Get Correct SendIT IDE title", () => {
    cy.visit("http://localhost:8001");

    cy.title().should("eq", "SendIT-IDE - Login");
  });
});
