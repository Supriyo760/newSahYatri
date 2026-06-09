const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src/app/api');

function processFile(filePath) {
  if (filePath.replace(/\\/g, '/').includes('auth/[...nextauth]')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Ensure imports are updated
  if (!content.includes('successResponse') && !content.includes('errorResponse')) {
    content = content.replace(/import\s+{([^}]*NextResponse[^}]*)}\s+from\s+['"]next\/server['"];?/g, 
      (match) => `${match}\nimport { successResponse, errorResponse } from '@/lib/api-response';`
    );
  }

  // Replace error responses: NextResponse.json({ error: 'msg' }, { status: 401 }) -> errorResponse('UNAUTHORIZED', 'msg', 401)
  content = content.replace(/NextResponse\.json\(\s*\{\s*error:\s*(['"`].*?['"`])\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g, 
    (match, msg, status) => {
      let code = 'ERROR';
      if (status == '401') code = 'UNAUTHORIZED';
      else if (status == '403') code = 'FORBIDDEN';
      else if (status == '400') code = 'BAD_REQUEST';
      else if (status == '404') code = 'NOT_FOUND';
      else if (status == '500') code = 'INTERNAL_ERROR';
      return `errorResponse('${code}', ${msg}, ${status})`;
    }
  );

  // Replace Zod error responses
  content = content.replace(/NextResponse\.json\(\s*\{\s*error:\s*err\.issues\s*\}\s*,\s*\{\s*status:\s*400\s*\}\s*\)/g, 
    `errorResponse('VALIDATION_ERROR', 'Validation failed', 400, err.issues)`
  );

  // Replace error with dynamic message: NextResponse.json({ error: `...` }, { status: 500 })
  content = content.replace(/NextResponse\.json\(\s*\{\s*error:\s*(`.*?`)\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/gs, 
    (match, msg, status) => {
      let code = 'ERROR';
      if (status == '500') code = 'INTERNAL_ERROR';
      return `errorResponse('${code}', ${msg}, ${status})`;
    }
  );

  // Replace success responses with data
  content = content.replace(/NextResponse\.json\(\s*\{\s*data:\s*([^}]*?)\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g, 
    (match, dataBlock, status) => {
      return `successResponse(${dataBlock.trim()}, ${status})`;
    }
  );

  // Replace success responses without status
  content = content.replace(/NextResponse\.json\(\s*\{\s*data:\s*([^}]*?)\s*\}\s*\)/g, 
    (match, dataBlock) => {
      return `successResponse(${dataBlock.trim()}, 200)`;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Updated: ' + filePath);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('route.ts')) {
      processFile(fullPath);
    }
  }
}

walk(apiDir);
console.log('Done.');
