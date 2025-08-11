import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const TEST_TOKEN = process.env.TEST_TOKEN;
const SERVER_URL = "http://localhost:6789/sse";

async function testMCPTools() {
    console.log("Connecting to MCP server...");
    
    const transport = new SSEClientTransport(
        new URL(SERVER_URL),
        { headers: { "Authorization": `Bearer ${TEST_TOKEN}` } }
    );
    
    const client = new Client(
        { name: "test-client", version: "1.0.0" },
        { capabilities: {} }
    );
    
    try {
        await client.connect(transport);
        console.log("✓ Connected to MCP server");
        
        // List available tools
        const tools = await client.listTools();
        console.log(`✓ Found ${tools.tools.length} tools:`);
        tools.tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
        });
        
        // Test a simple tool
        if (tools.tools.find(t => t.name === "get_config")) {
            const result = await client.callTool("get_config", {});
            console.log("✓ Successfully called get_config tool");
        }
        
        await client.close();
        console.log("✓ Connection closed successfully");
        return 0;
    } catch (error) {
        console.error("✗ Error:", error.message);
        return 1;
    }
}

testMCPTools().then(code => process.exit(code));
