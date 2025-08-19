class ChessGame {
    constructor() {
        this.board = [];
        this.currentTurn = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.lastMove = null;
        this.capturedPieces = { white: [], black: [] };
        this.kingsKilled = 0;
        this.isCheck = false;
        this.isCheckmate = false;
        this.isStalemate = false;
        this.moveLog = [];
        this.activeArmies = new Set();
        
        this.pieces = {
            white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
            black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
        };
        
        this.init();
    }
    
    init() {
        this.setupBoard();
        this.renderBoard();
        this.attachEventListeners();
        this.attachModalListeners();
        
        // Initial scroll to show white pieces at bottom
        setTimeout(() => {
            const boardElement = document.getElementById('board');
            boardElement.scrollTop = boardElement.scrollHeight - boardElement.clientHeight;
        }, 100);
    }
    
    setupBoard() {
        // Initialize 8x80 board
        this.board = Array(80).fill(null).map(() => Array(8).fill(null));
        
        // Place pieces in starting positions
        const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        
        // White pieces (bottom of board - rows 0-1)
        for (let col = 0; col < 8; col++) {
            this.board[0][col] = { type: backRow[col], color: 'white', hasMoved: false };
            this.board[1][col] = { type: 'pawn', color: 'white', hasMoved: false };
        }
        
        // Place black armies with 4-row gaps starting from row 6-7
        const armyRows = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78];
        
        armyRows.forEach((startRow, index) => {
            for (let col = 0; col < 8; col++) {
                this.board[startRow][col] = { type: 'pawn', color: 'black', hasMoved: false };
                this.board[startRow + 1][col] = { type: backRow[col], color: 'black', hasMoved: false };
            }
        });
    }
    
    renderBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';
        
        for (let row = 79; row >= 0; row--) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Highlight last move
                if (this.lastMove) {
                    if ((row === this.lastMove.from.row && col === this.lastMove.from.col) ||
                        (row === this.lastMove.to.row && col === this.lastMove.to.col)) {
                        square.classList.add('last-move');
                    }
                }
                
                // Highlight selected square
                if (this.selectedSquare && 
                    this.selectedSquare.row === row && 
                    this.selectedSquare.col === col) {
                    square.classList.add('selected');
                }
                
                // Show valid moves
                if (this.validMoves.some(move => move.row === row && move.col === col)) {
                    const piece = this.board[row][col];
                    if (piece && piece.color !== this.currentTurn) {
                        square.classList.add('valid-capture');
                    } else {
                        square.classList.add('valid-move');
                    }
                }
                
                // Add piece if exists
                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.color}`;
                    pieceElement.textContent = this.pieces[piece.color][piece.type];
                    square.appendChild(pieceElement);
                    
                    // Highlight king in check
                    if (piece.type === 'king' && piece.color === this.currentTurn && this.isCheck) {
                        square.classList.add('check');
                    }
                }
                
                boardElement.appendChild(square);
            }
        }
        
        this.updateStatus();
        this.updateCapturedPieces();
        this.updateKingsKilled();
    }
    
    attachEventListeners() {
        document.getElementById('board').addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (square) {
                const row = parseInt(square.dataset.row);
                const col = parseInt(square.dataset.col);
                this.handleSquareClick(row, col);
            }
        });
        
        document.getElementById('new-game').addEventListener('click', () => {
            this.resetGame();
        });
    }
    
    attachModalListeners() {
        document.getElementById('show-log').addEventListener('click', () => {
            this.showMoveLog();
        });
        
        document.getElementById('close-log').addEventListener('click', () => {
            this.hideMoveLog();
        });
        
        document.getElementById('log-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'log-modal-overlay') {
                this.hideMoveLog();
            }
        });
    }
    
    handleSquareClick(row, col) {
        if (this.isCheckmate || this.isStalemate) return;
        
        const piece = this.board[row][col];
        
        if (this.selectedSquare) {
            // Try to move
            if (this.validMoves.some(move => move.row === row && move.col === col)) {
                this.makeMove(this.selectedSquare, { row, col });
                return;
            }
            // Deselect if clicking the same square
            if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
                this.selectedSquare = null;
                this.validMoves = [];
                this.renderBoard();
                return;
            }
        }
        
        // Select piece if it belongs to current player
        if (piece && piece.color === this.currentTurn) {
            this.selectedSquare = { row, col };
            this.validMoves = this.getValidMoves(row, col);
            this.renderBoard();
        } else {
            this.selectedSquare = null;
            this.validMoves = [];
            this.renderBoard();
        }
    }
    
    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];
        
        let moves = [];
        
        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(row, col);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col);
                break;
            case 'knight':
                moves = this.getKnightMoves(row, col);
                break;
            case 'bishop':
                moves = this.getBishopMoves(row, col);
                break;
            case 'queen':
                moves = this.getQueenMoves(row, col);
                break;
            case 'king':
                moves = this.getKingMoves(row, col);
                break;
        }
        
        // Filter out moves that would leave king in check
        return moves.filter(move => !this.wouldBeInCheck(row, col, move.row, move.col));
    }
    
    getPawnMoves(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        const direction = piece.color === 'white' ? 1 : -1;
        
        // Move forward one square
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push({ row: row + direction, col });
            
            // Move forward two squares from starting position
            if (!piece.hasMoved && 
                this.isInBounds(row + direction * 2, col) && 
                !this.board[row + direction * 2][col]) {
                moves.push({ row: row + direction * 2, col });
            }
        }
        
        // Capture diagonally
        [-1, 1].forEach(colOffset => {
            if (this.isInBounds(row + direction, col + colOffset)) {
                const target = this.board[row + direction][col + colOffset];
                if (target && target.color !== piece.color) {
                    moves.push({ row: row + direction, col: col + colOffset });
                }
            }
        });
        
        // En passant
        if ((piece.color === 'white' && row === 4) || (piece.color === 'black' && row === 3)) {
            [-1, 1].forEach(colOffset => {
                if (this.isInBounds(row, col + colOffset)) {
                    const adjacentPiece = this.board[row][col + colOffset];
                    if (adjacentPiece && 
                        adjacentPiece.type === 'pawn' && 
                        adjacentPiece.color !== piece.color &&
                        this.lastMove &&
                        this.lastMove.to.row === row &&
                        this.lastMove.to.col === col + colOffset &&
                        Math.abs(this.lastMove.from.row - this.lastMove.to.row) === 2) {
                        moves.push({ row: row + direction, col: col + colOffset, enPassant: true });
                    }
                }
            });
        }
        
        return moves;
    }
    
    getRookMoves(row, col) {
        const moves = [];
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (const [dRow, dCol] of directions) {
            for (let i = 1; i < 80; i++) {
                const newRow = row + dRow * i;
                const newCol = col + dCol * i;
                
                if (!this.isInBounds(newRow, newCol)) break;
                
                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (target.color !== this.board[row][col].color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
            }
        }
        
        return moves;
    }
    
    getKnightMoves(row, col) {
        const moves = [];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        
        for (const [dRow, dCol] of offsets) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (this.isInBounds(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== this.board[row][col].color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
        
        return moves;
    }
    
    getBishopMoves(row, col) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        
        for (const [dRow, dCol] of directions) {
            for (let i = 1; i < 80; i++) {
                const newRow = row + dRow * i;
                const newCol = col + dCol * i;
                
                if (!this.isInBounds(newRow, newCol)) break;
                
                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (target.color !== this.board[row][col].color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
            }
        }
        
        return moves;
    }
    
    getQueenMoves(row, col) {
        return [...this.getRookMoves(row, col), ...this.getBishopMoves(row, col)];
    }
    
    getKingMoves(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        
        for (let dRow = -1; dRow <= 1; dRow++) {
            for (let dCol = -1; dCol <= 1; dCol++) {
                if (dRow === 0 && dCol === 0) continue;
                
                const newRow = row + dRow;
                const newCol = col + dCol;
                
                if (this.isInBounds(newRow, newCol)) {
                    const target = this.board[newRow][newCol];
                    if (!target || target.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        
        // Castling
        if (!piece.hasMoved && !this.isCheck) {
            // King side castling
            const kingSideRook = this.board[row][7];
            if (kingSideRook && kingSideRook.type === 'rook' && !kingSideRook.hasMoved) {
                if (!this.board[row][5] && !this.board[row][6]) {
                    if (!this.isSquareUnderAttack(row, 5, piece.color) && 
                        !this.isSquareUnderAttack(row, 6, piece.color)) {
                        moves.push({ row, col: 6, castling: 'kingside' });
                    }
                }
            }
            
            // Queen side castling
            const queenSideRook = this.board[row][0];
            if (queenSideRook && queenSideRook.type === 'rook' && !queenSideRook.hasMoved) {
                if (!this.board[row][1] && !this.board[row][2] && !this.board[row][3]) {
                    if (!this.isSquareUnderAttack(row, 2, piece.color) && 
                        !this.isSquareUnderAttack(row, 3, piece.color)) {
                        moves.push({ row, col: 2, castling: 'queenside' });
                    }
                }
            }
        }
        
        return moves;
    }
    
    makeMove(from, to) {
        const piece = this.board[from.row][from.col];
        const capturedPiece = this.board[to.row][to.col];
        
        // Log the move
        this.logMove(piece, from, to, capturedPiece);
        
        // Handle captures
        if (capturedPiece) {
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
            // Count kings killed
            if (capturedPiece.type === 'king' && capturedPiece.color === 'black') {
                this.kingsKilled++;
            }
        }
        
        // Handle en passant
        const move = this.validMoves.find(m => m.row === to.row && m.col === to.col);
        if (move && move.enPassant) {
            const capturedPawn = this.board[from.row][to.col];
            this.capturedPieces[capturedPawn.color].push(capturedPawn);
            this.board[from.row][to.col] = null;
        }
        
        // Handle castling
        if (move && move.castling) {
            if (move.castling === 'kingside') {
                this.board[from.row][5] = this.board[from.row][7];
                this.board[from.row][7] = null;
                this.board[from.row][5].hasMoved = true;
            } else if (move.castling === 'queenside') {
                this.board[from.row][3] = this.board[from.row][0];
                this.board[from.row][0] = null;
                this.board[from.row][3].hasMoved = true;
            }
        }
        
        // Move piece
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;
        piece.hasMoved = true;
        
        // Pawn promotion disabled for now
        
        // Update game state
        this.lastMove = { from, to };
        this.selectedSquare = null;
        this.validMoves = [];
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';
        
        // Check for check/checkmate
        this.isCheck = this.isInCheck(this.currentTurn);
        if (this.isCheck) {
            if (this.isInCheckmate(this.currentTurn)) {
                this.isCheckmate = true;
            }
        } else if (this.isInStalemate(this.currentTurn)) {
            this.isStalemate = true;
        }
        
        this.renderBoard();
        
        // Computer move
        if (this.currentTurn === 'black' && !this.isCheckmate && !this.isStalemate) {
            setTimeout(() => this.makeComputerMove(), 500);
        }
    }
    
    makeComputerMove() {
        const allMoves = [];
        const armyRows = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78];
        
        // Find the lowest white piece position
        let lowestWhitePieceRow = -1;
        for (let row = 79; row >= 0; row--) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === 'white') {
                    lowestWhitePieceRow = Math.max(lowestWhitePieceRow, row);
                }
            }
        }
        
        // Collect all possible moves from active armies only
        for (let row = 0; row < 80; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === 'black') {
                    // Check if this piece's army should be active
                    let armyIndex = -1;
                    for (let i = 0; i < armyRows.length; i++) {
                        if (row === armyRows[i] || row === armyRows[i] + 1) {
                            armyIndex = i;
                            break;
                        }
                    }
                    
                    // Army is active if white pieces are within 4 rows of this army
                    const armyStartRow = armyIndex >= 0 ? armyRows[armyIndex] : row;
                    const isArmyActive = (lowestWhitePieceRow + 4) >= armyStartRow;
                    
                    if (isArmyActive) {
                        // Check if this army just became active
                        if (armyIndex >= 0 && !this.activeArmies.has(armyIndex)) {
                            this.activeArmies.add(armyIndex);
                            this.addLogEntry(`Army ${armyIndex + 1} awakens!`, true);
                        }
                        
                        const moves = this.getValidMoves(row, col);
                        moves.forEach(move => {
                            allMoves.push({
                                from: { row, col },
                                to: move,
                                score: this.evaluateMove(row, col, move)
                            });
                        });
                    }
                }
            }
        }
        
        if (allMoves.length === 0) {
            // No active armies can move, black passes turn
            this.currentTurn = 'white';
            this.showPassMessage();
            this.renderBoard();
            return;
        }
        
        // Sort moves by score and pick from top moves
        allMoves.sort((a, b) => b.score - a.score);
        const topMoves = allMoves.filter(m => m.score === allMoves[0].score);
        const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
        
        this.selectedSquare = selectedMove.from;
        this.validMoves = this.getValidMoves(selectedMove.from.row, selectedMove.from.col);
        this.renderBoard();
        
        setTimeout(() => {
            this.makeMove(selectedMove.from, selectedMove.to);
        }, 300);
    }
    
    evaluateMove(fromRow, fromCol, move) {
        // Determine AI difficulty based on piece's army position
        const armyRows = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78];
        let armyIndex = -1;
        
        // Find which army this piece belongs to
        for (let i = 0; i < armyRows.length; i++) {
            if (fromRow === armyRows[i] || fromRow === armyRows[i] + 1) {
                armyIndex = i;
                break;
            }
        }
        
        // Calculate difficulty multiplier (0.2 for first army, up to 2.0 for last army)
        const difficultyMultiplier = armyIndex >= 0 ? 0.2 + (armyIndex * 0.15) : 1.0;
        
        let score = Math.random() * (5 / difficultyMultiplier); // Less randomness for harder armies
        
        const piece = this.board[fromRow][fromCol];
        const target = this.board[move.row][move.col];
        
        // Prioritize captures (scaled by difficulty)
        if (target) {
            const pieceValues = {
                pawn: 10,
                knight: 30,
                bishop: 30,
                rook: 50,
                queen: 90,
                king: 1000
            };
            score += pieceValues[target.type] * difficultyMultiplier;
        }
        
        // Prioritize center control (scaled by difficulty)
        const centerDistance = Math.abs(3.5 - move.row) + Math.abs(3.5 - move.col);
        score += (7 - centerDistance) * 2 * difficultyMultiplier;
        
        // Prioritize piece development (scaled by difficulty)
        if (!piece.hasMoved) {
            score += 15 * difficultyMultiplier;
        }
        
        // Check if move gives check (scaled by difficulty)
        const tempBoard = this.cloneBoard();
        tempBoard[move.row][move.col] = tempBoard[fromRow][fromCol];
        tempBoard[fromRow][fromCol] = null;
        if (this.wouldGiveCheck(tempBoard, 'white')) {
            score += 50 * difficultyMultiplier;
        }
        
        // Avoid moves that put piece in danger (better avoidance for harder armies)
        if (this.isSquareUnderAttack(move.row, move.col, 'black')) {
            const pieceValues = {
                pawn: 10,
                knight: 30,
                bishop: 30,
                rook: 50,
                queen: 90,
                king: 1000
            };
            score -= (pieceValues[piece.type] * difficultyMultiplier) / 2;
        }
        
        // Advanced tactical awareness for higher armies
        if (difficultyMultiplier > 1.0) {
            // Look for tactical patterns like forks, pins, skewers
            if (this.createsTacticalThreat(fromRow, fromCol, move)) {
                score += 25 * difficultyMultiplier;
            }
            
            // Better king safety awareness
            if (piece.type === 'king' && this.exposesKing(fromRow, fromCol, move)) {
                score -= 30 * difficultyMultiplier;
            }
        }
        
        return score;
    }
    
    createsTacticalThreat(fromRow, fromCol, move) {
        // Simple tactical threat detection (fork, pin basic patterns)
        const piece = this.board[fromRow][fromCol];
        
        // Knight forks - check if knight can attack multiple valuable pieces
        if (piece.type === 'knight') {
            let threatenedPieces = 0;
            // Simulate the knight moves from the new position
            const offsets = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];
            
            for (const [dRow, dCol] of offsets) {
                const newRow = move.row + dRow;
                const newCol = move.col + dCol;
                
                if (this.isInBounds(newRow, newCol)) {
                    const target = this.board[newRow][newCol];
                    if (target && target.color === 'white' && 
                        (target.type === 'king' || target.type === 'queen' || target.type === 'rook')) {
                        threatenedPieces++;
                    }
                }
            }
            return threatenedPieces >= 2;
        }
        
        return false;
    }
    
    exposesKing(fromRow, fromCol, move) {
        // Simple king exposure check
        const tempBoard = this.cloneBoard();
        tempBoard[move.row][move.col] = tempBoard[fromRow][fromCol];
        tempBoard[fromRow][fromCol] = null;
        
        return this.isPositionUnderAttackOnBoard(move.row, move.col, 'black', tempBoard);
    }
    
    isInBounds(row, col) {
        return row >= 0 && row < 80 && col >= 0 && col < 8;
    }
    
    isSquareUnderAttack(row, col, byColor) {
        const enemyColor = byColor === 'white' ? 'black' : 'white';
        
        for (let r = 0; r < 80; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === enemyColor) {
                    const moves = this.getValidMovesWithoutCheckFilter(r, c);
                    if (moves.some(move => move.row === row && move.col === col)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    getValidMovesWithoutCheckFilter(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];
        
        switch (piece.type) {
            case 'pawn': return this.getPawnMoves(row, col);
            case 'rook': return this.getRookMoves(row, col);
            case 'knight': return this.getKnightMoves(row, col);
            case 'bishop': return this.getBishopMoves(row, col);
            case 'queen': return this.getQueenMoves(row, col);
            case 'king': return this.getKingMovesWithoutCastling(row, col);
            default: return [];
        }
    }
    
    getKingMovesWithoutCastling(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        
        for (let dRow = -1; dRow <= 1; dRow++) {
            for (let dCol = -1; dCol <= 1; dCol++) {
                if (dRow === 0 && dCol === 0) continue;
                
                const newRow = row + dRow;
                const newCol = col + dCol;
                
                if (this.isInBounds(newRow, newCol)) {
                    const target = this.board[newRow][newCol];
                    if (!target || target.color !== piece.color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        
        return moves;
    }
    
    wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
        // Make temporary move
        const tempBoard = this.cloneBoard();
        tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
        tempBoard[fromRow][fromCol] = null;
        
        // Find king position
        let kingPos = null;
        for (let row = 0; row < 80; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = tempBoard[row][col];
                if (piece && piece.type === 'king' && piece.color === this.currentTurn) {
                    kingPos = { row, col };
                    break;
                }
            }
            if (kingPos) break;
        }
        
        // Check if king is under attack
        return this.isPositionUnderAttackOnBoard(kingPos.row, kingPos.col, this.currentTurn, tempBoard);
    }
    
    isPositionUnderAttackOnBoard(row, col, byColor, board) {
        const enemyColor = byColor === 'white' ? 'black' : 'white';
        
        for (let r = 0; r < 80; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.color === enemyColor) {
                    if (this.canPieceAttackPosition(piece, r, c, row, col, board)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    canPieceAttackPosition(piece, fromRow, fromCol, toRow, toCol, board) {
        const dRow = toRow - fromRow;
        const dCol = toCol - fromCol;
        
        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? 1 : -1;
                return dRow === direction && Math.abs(dCol) === 1;
                
            case 'knight':
                return (Math.abs(dRow) === 2 && Math.abs(dCol) === 1) ||
                       (Math.abs(dRow) === 1 && Math.abs(dCol) === 2);
                       
            case 'bishop':
                if (Math.abs(dRow) !== Math.abs(dCol)) return false;
                return this.isPathClear(fromRow, fromCol, toRow, toCol, board);
                
            case 'rook':
                if (dRow !== 0 && dCol !== 0) return false;
                return this.isPathClear(fromRow, fromCol, toRow, toCol, board);
                
            case 'queen':
                if (dRow !== 0 && dCol !== 0 && Math.abs(dRow) !== Math.abs(dCol)) return false;
                return this.isPathClear(fromRow, fromCol, toRow, toCol, board);
                
            case 'king':
                return Math.abs(dRow) <= 1 && Math.abs(dCol) <= 1;
                
            default:
                return false;
        }
    }
    
    isPathClear(fromRow, fromCol, toRow, toCol, board) {
        const dRow = Math.sign(toRow - fromRow);
        const dCol = Math.sign(toCol - fromCol);
        
        let currentRow = fromRow + dRow;
        let currentCol = fromCol + dCol;
        
        while (currentRow !== toRow || currentCol !== toCol) {
            if (board[currentRow][currentCol]) return false;
            currentRow += dRow;
            currentCol += dCol;
        }
        
        return true;
    }
    
    isInCheck(color) {
        let kingPos = null;
        for (let row = 0; row < 80; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    kingPos = { row, col };
                    break;
                }
            }
            if (kingPos) break;
        }
        
        return this.isSquareUnderAttack(kingPos.row, kingPos.col, color);
    }
    
    isInCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        
        // Check if any move can get out of check
        for (let row = 0; row < 80; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) return false;
                }
            }
        }
        
        return true;
    }
    
    isInStalemate(color) {
        if (this.isInCheck(color)) return false;
        
        // Check if any legal move exists
        for (let row = 0; row < 80; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(row, col);
                    if (moves.length > 0) return false;
                }
            }
        }
        
        return true;
    }
    
    wouldGiveCheck(board, color) {
        let kingPos = null;
        for (let row = 0; row < 80; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    kingPos = { row, col };
                    break;
                }
            }
            if (kingPos) break;
        }
        
        return this.isPositionUnderAttackOnBoard(kingPos.row, kingPos.col, color, board);
    }
    
    cloneBoard() {
        return this.board.map(row => 
            row.map(piece => 
                piece ? { ...piece } : null
            )
        );
    }
    
    updateStatus() {
        const status = document.getElementById('status');
        
        if (this.isCheckmate) {
            const winner = this.currentTurn === 'white' ? 'Black' : 'White';
            status.textContent = `Checkmate! ${winner} wins!`;
            status.style.color = '#e74c3c';
        } else if (this.isStalemate) {
            status.textContent = 'Stalemate! Draw!';
            status.style.color = '#f39c12';
        } else if (this.isCheck) {
            status.textContent = `${this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1)} is in check!`;
            status.style.color = '#e67e22';
        } else {
            status.textContent = `${this.currentTurn.charAt(0).toUpperCase() + this.currentTurn.slice(1)}'s turn`;
            status.style.color = '#666';
        }
    }
    
    updateCapturedPieces() {
        const whiteCaptured = document.getElementById('white-captured');
        const blackCaptured = document.getElementById('black-captured');
        
        whiteCaptured.innerHTML = '';
        this.capturedPieces.black.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'piece black';
            pieceElement.textContent = this.pieces.black[piece.type];
            whiteCaptured.appendChild(pieceElement);
        });
        
        blackCaptured.innerHTML = '';
        this.capturedPieces.white.forEach(piece => {
            const pieceElement = document.createElement('span');
            pieceElement.className = 'piece white';
            pieceElement.textContent = this.pieces.white[piece.type];
            blackCaptured.appendChild(pieceElement);
        });
    }
    
    updateKingsKilled() {
        document.getElementById('kings-killed').textContent = this.kingsKilled;
    }
    
    showPassMessage() {
        const status = document.getElementById('status');
        const originalText = status.textContent;
        status.textContent = 'Black armies dormant... White\'s turn';
        status.style.color = '#a67c5a';
        
        // Revert after a short delay
        setTimeout(() => {
            this.updateStatus();
        }, 1500);
    }
    
    logMove(piece, from, to, capturedPiece) {
        const fromSquare = this.getSquareName(from.row, from.col);
        const toSquare = this.getSquareName(to.row, to.col);
        const pieceName = this.getPieceName(piece);
        const armyInfo = piece.color === 'black' ? this.getArmyInfo(from.row) : '';
        
        let moveText = `${piece.color === 'white' ? 'White' : armyInfo} ${pieceName} ${fromSquare}→${toSquare}`;
        
        if (capturedPiece) {
            const capturedName = this.getPieceName(capturedPiece);
            const capturedArmyInfo = capturedPiece.color === 'black' ? this.getArmyInfo(to.row) : '';
            moveText += ` captures ${capturedPiece.color === 'white' ? 'White' : capturedArmyInfo} ${capturedName}`;
            
            // Check if this was a king capture (army elimination)
            if (capturedPiece.type === 'king' && capturedPiece.color === 'black') {
                const armyNumber = this.getArmyNumber(to.row);
                if (armyNumber > 0) {
                    this.addLogEntry(`Army ${armyNumber} eliminated!`, true);
                }
            }
        }
        
        this.addLogEntry(moveText);
    }
    
    getSquareName(row, col) {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        return files[col] + (row + 1);
    }
    
    getPieceName(piece) {
        return piece.type.charAt(0).toUpperCase() + piece.type.slice(1);
    }
    
    getArmyInfo(row) {
        const armyNumber = this.getArmyNumber(row);
        return armyNumber > 0 ? `Army ${armyNumber}` : 'Black';
    }
    
    getArmyNumber(row) {
        const armyRows = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78];
        for (let i = 0; i < armyRows.length; i++) {
            if (row === armyRows[i] || row === armyRows[i] + 1) {
                return i + 1;
            }
        }
        return 0;
    }
    
    addLogEntry(text, isEvent = false) {
        this.moveLog.unshift({ text, isEvent, timestamp: Date.now() });
        this.updateLogDisplay();
    }
    
    updateLogDisplay() {
        const logContent = document.getElementById('log-content');
        if (this.moveLog.length === 0) {
            logContent.innerHTML = '<p class="no-moves">No moves yet - start playing!</p>';
            return;
        }
        
        logContent.innerHTML = this.moveLog.map(entry => 
            `<div class="move-entry ${entry.isEvent ? 'event' : ''}">${entry.text}</div>`
        ).join('');
    }
    
    showMoveLog() {
        document.getElementById('log-modal-overlay').style.display = 'block';
        // Scroll to top to show most recent moves
        const logContent = document.getElementById('log-content');
        logContent.scrollTop = 0;
    }
    
    hideMoveLog() {
        document.getElementById('log-modal-overlay').style.display = 'none';
    }
    
    resetGame() {
        this.currentTurn = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.lastMove = null;
        this.capturedPieces = { white: [], black: [] };
        this.kingsKilled = 0;
        this.isCheck = false;
        this.isCheckmate = false;
        this.isStalemate = false;
        this.moveLog = [];
        this.activeArmies = new Set();
        
        this.setupBoard();
        this.renderBoard();
        this.updateLogDisplay();
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});