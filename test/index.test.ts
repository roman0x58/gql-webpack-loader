import loader from '../index'

describe("gql loader", () => {
    test('transforms GraphQL query to es6 module with operation name', () => {
            const result = loader(`
                query ABC {
                    A
                    ...C
                }
                fragment C on ABC {
                    Y
                }
                fragment B on ABC {
                    Y
                }
            `)
            expect(result).toMatchSnapshot()
        }
    )
})