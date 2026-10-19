import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
// Import the PrismaClient from the generated Prisma client
import { PrismaClient } from "@prisma/client";

// GraphQL schema
const typeDefs = `
    type Recipe {
        id: ID!
        title: String! #the ! means this field cannot be null
        instructions: String!
        prepTimeMinutes: Int!
        cookTimeMinutes: Int!
        servings: Int!
        ingredients: [RecipeIngredient!]!
    }

    type Ingredient {
        id: ID!
        name: String!
    }

    type RecipeIngredient {
        id: ID!
        quantity: String!
        unit: String!
        ingredient: Ingredient!
    }
    
    type Query {
        recipes: [Recipe!]!
    }
    
    type Mutation {
        createRecipe(
            title: String!
            instructions: String!
            prepTimeMinutes: Int!
            cookTimeMinutes: Int!
            servings: Int!
        ): Recipe!

        addIngredientToRecipe(
            recipeId: ID!
            ingredientName: String!
            quantity: String!
            unit: String!
        ): RecipeIngredient!
    }
`;

// The connection object to talk to the database
const prisma = new PrismaClient(); 

// Resolvers define how to fetch the types defined in the schema
const resolvers = { 
    Recipe: {
        ingredients: async (parent: { id: number }) => {
            return prisma.recipeIngredient.findMany({
                where: { recipeId: parent.id },
                include: { ingredient: true }, // Include the related ingredient data
            });
        },
    },
    
    Query: {
        recipes: async () => {
            return prisma.recipe.findMany();
        },
    },

    Mutation: {
        createRecipe: async (_parent: unknown, args: {
            title: string;
            instructions: string;
            prepTimeMinutes: number;
            cookTimeMinutes: number;
            servings: number;
        }) => {
            return prisma.recipe.create({   
                data: args,
            });
        },
    
        addIngredientToRecipe: async (parent: unknown, args: {
            recipeId: string;
            ingredientName: string;
            quantity: string;
            unit: string;
        }) => {
            // upsert means to update if it exists, or create if it doesn't exist
            const ingredient = await prisma.ingredient.upsert({
                where: { name: args.ingredientName },
                update: {},
                create: { name: args.ingredientName },
            });

            return prisma.recipeIngredient.create({
                data: {
                    recipeId: Number(args.recipeId),
                    ingredientId: ingredient.id,
                    quantity: args.quantity,
                    unit: args.unit,
                },
                // include the ingredient in the response
                include: { ingredient: true },
            });
        },
    },
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

async function startServer() {
    const { url } = await startStandaloneServer(server, {
        listen: { port: 4000 },
    });
    console.log(`Server ready at ${url}`);
}

startServer();