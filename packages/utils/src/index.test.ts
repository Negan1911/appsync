import * as index from "index"
// @ponicode
describe("index.GraphQLParser.ExtractFromSchema", () => {
    test("0", () => {
        let callFunction: any = () => {
            index.GraphQLParser.ExtractFromSchema("UPDATE Projects SET pname = %s WHERE pid = %s")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            index.GraphQLParser.ExtractFromSchema("DROP TABLE tmp;")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction: any = () => {
            index.GraphQLParser.ExtractFromSchema("UNLOCK TABLES;")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction: any = () => {
            index.GraphQLParser.ExtractFromSchema("DELETE FROM Projects WHERE pid = %s")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction: any = () => {
            index.GraphQLParser.ExtractFromSchema("SELECT * FROM Movies WHERE Title=’Jurassic Park’ AND Director='Steven Spielberg';")
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction: any = () => {
            index.GraphQLParser.ExtractFromSchema("")
        }
    
        expect(callFunction).not.toThrow()
    })
})
