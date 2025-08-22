class ChessGame {
    constructor() {
        this.board = [];
        this.currentTurn = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.lastMove = null;
        this.capturedPieces = { white: [], black: [] };
        this.boardsCleared = 0;
        this.isCheck = false;
        this.isCheckmate = false;
        this.isStalemate = false;
        this.moveLog = [];
        this.whiteArmy = null;
        this.isGameOver = false;
        this.pendingPromotion = null;
        this.pendingPieceSelection = null;
        
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
        
        // No scrolling needed for single board
    }
    
    setupBoard() {
        // Initialize standard 8x8 board
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        const backRow = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        
        // If this is the first board, set up white pieces
        if (!this.whiteArmy) {
            this.whiteArmy = [];
            for (let col = 0; col < 8; col++) {
                this.board[0][col] = { type: backRow[col], color: 'white', hasMoved: false, id: `white-${backRow[col]}-${col}` };
                this.board[1][col] = { type: 'pawn', color: 'white', hasMoved: false, id: `white-pawn-${col}` };
                this.whiteArmy.push(this.board[0][col]);
                this.whiteArmy.push(this.board[1][col]);
            }
        } else {
            // Place surviving white pieces
            this.placeWhiteArmy();
        }
        
        // Black pieces always get a fresh army
        for (let col = 0; col < 8; col++) {
            this.board[6][col] = { type: 'pawn', color: 'black', hasMoved: false };
            this.board[7][col] = { type: backRow[col], color: 'black', hasMoved: false };
        }
    }
    
    placeWhiteArmy() {
        // Clear white positions first
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] && this.board[row][col].color === 'white') {
                    this.board[row][col] = null;
                }
            }
        }
        
        // Place surviving white pieces
        const placedPositions = new Set();
        
        this.whiteArmy.forEach(piece => {
            let row, col;
            
            // Check if this is an original piece or a reward piece
            if (piece.id.startsWith('reward-')) {
                // Find empty position for reward pieces
                const emptyPosition = this.findEmptyPosition(placedPositions);
                if (emptyPosition) {
                    row = emptyPosition.row;
                    col = emptyPosition.col;
                }
            } else {
                // Original pieces go to their starting positions
                if (piece.type === 'pawn') {
                    row = 1;
                    col = parseInt(piece.id.split('-')[2]);
                } else {
                    row = 0;
                    col = parseInt(piece.id.split('-')[2]);
                }
            }
            
            // Only place if position is valid and not occupied
            if (row >= 0 && row < 8 && col >= 0 && col < 8 && !placedPositions.has(`${row}-${col}`)) {
                this.board[row][col] = piece;
                placedPositions.add(`${row}-${col}`);
            }
        });
    }
    
    findEmptyPosition(placedPositions) {
        // Try to place on back rows first (0-1), then move forward
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const posKey = `${row}-${col}`;
                if (!placedPositions.has(posKey) && !this.board[row][col]) {
                    return { row, col };
                }
            }
        }
        return null; // No empty position found
    }
    
    renderBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';
        
        for (let row = 7; row >= 0; row--) {
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
        this.updateBoardsCleared();
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
        
        document.getElementById('debug-win').addEventListener('click', () => {
            this.debugWinBoard();
        });
        
        // Debug controls
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'v') {
                this.debugCaptureBlackKing();
            } else if (e.key.toLowerCase() === 'l') {
                this.debugKillAllWhitePieces();
            }
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
        
        // Pawn promotion event listeners
        document.querySelectorAll('.promotion-choice').forEach(button => {
            button.addEventListener('click', (e) => {
                const pieceType = e.target.dataset.piece;
                this.completePawnPromotion(pieceType);
            });
        });
        
        document.getElementById('promotion-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'promotion-modal-overlay') {
                // Don't allow closing promotion modal by clicking overlay - must choose
            }
        });
        
        // Piece selection modal (will be dynamically populated)
        document.getElementById('piece-selection-modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'piece-selection-modal-overlay') {
                // Don't allow closing piece selection modal by clicking overlay - must choose
            }
        });
    }
    
    handleSquareClick(row, col) {
        if (this.isCheckmate || this.isStalemate || this.isGameOver) return;
        
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
            for (let i = 1; i < 8; i++) {
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
            for (let i = 1; i < 8; i++) {
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
            
            // If white piece captured, remove from army
            if (capturedPiece.color === 'white') {
                this.whiteArmy = this.whiteArmy.filter(p => p.id !== capturedPiece.id);
            }
            
            // Check if black king was captured
            if (capturedPiece.type === 'king' && capturedPiece.color === 'black') {
                this.boardsCleared++;
                
                // Update game state first
                this.lastMove = { from, to };
                this.selectedSquare = null;
                this.validMoves = [];
                
                this.advanceToNextBoard();
                return;
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
        
        // Check for pawn promotion
        if (piece.type === 'pawn') {
            const promotionRow = piece.color === 'white' ? 7 : 0;
            if (to.row === promotionRow) {
                if (piece.color === 'white') {
                    // Human player promotion - show modal
                    this.pendingPromotion = { row: to.row, col: to.col, piece };
                    this.showPromotionModal();
                    return; // Don't continue with turn logic until promotion is chosen
                } else {
                    // AI promotion - auto-promote to queen
                    piece.type = 'queen';
                    this.addLogEntry(`Black pawn promoted to queen at ${this.getSquareName(to.row, to.col)}`, true);
                }
            }
        }
        
        // Update game state
        this.lastMove = { from, to };
        this.selectedSquare = null;
        this.validMoves = [];
        
        // If no promotion is pending, continue with normal turn flow
        if (!this.pendingPromotion) {
            this.finalizeTurn();
        }
    }
    
    makeComputerMove() {
        const allMoves = [];
        
        // Collect all possible moves for black pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === 'black') {
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
        
        if (allMoves.length === 0) {
            // No moves available
            if (this.isInCheck('black')) {
                // Checkmate - white wins this board
                this.boardsCleared++;
                this.advanceToNextBoard();
            } else {
                // Stalemate
                this.currentTurn = 'white';
                this.renderBoard();
            }
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
        // Exponential difficulty scaling - gets much harder quickly
        const difficultyMultiplier = Math.min(0.3 + (this.boardsCleared * 0.4), 5.0);
        const isHardMode = this.boardsCleared >= 3;
        const isExpertMode = this.boardsCleared >= 6;
        
        let score = Math.random() * (8 / difficultyMultiplier); // Much less randomness for harder armies
        
        const piece = this.board[fromRow][fromCol];
        const target = this.board[move.row][move.col];
        
        const pieceValues = {
            pawn: 10,
            knight: 30,
            bishop: 30,
            rook: 50,
            queen: 90,
            king: 1000
        };
        
        // Prioritize captures with smart piece value assessment
        if (target) {
            let captureValue = pieceValues[target.type] * difficultyMultiplier;
            
            // Advanced capture evaluation for harder boards
            if (isHardMode) {
                // Consider if capturing piece will be recaptured
                if (this.isSquareUnderAttack(move.row, move.col, 'black')) {
                    const tradeValue = pieceValues[target.type] - pieceValues[piece.type];
                    if (tradeValue > 0) {
                        captureValue += tradeValue * 0.8; // Good trade
                    } else {
                        captureValue += tradeValue * 1.2; // Bad trade penalty
                    }
                }
            }
            
            score += captureValue;
        }
        
        // Positional understanding improves dramatically
        if (isHardMode) {
            // Advanced center control
            const centerDistance = Math.abs(3.5 - move.row) + Math.abs(3.5 - move.col);
            score += (7 - centerDistance) * 3 * difficultyMultiplier;
            
            // Piece coordination
            score += this.evaluatePieceCoordination(fromRow, fromCol, move) * difficultyMultiplier;
            
            // King safety becomes a major priority
            score += this.evaluateKingSafety(move) * difficultyMultiplier * 2;
        } else {
            // Basic center control for early boards
            const centerDistance = Math.abs(3.5 - move.row) + Math.abs(3.5 - move.col);
            score += (7 - centerDistance) * 2 * difficultyMultiplier;
        }
        
        // Development bonus decreases as AI gets smarter (focuses more on tactics)
        if (!piece.hasMoved) {
            const developmentBonus = Math.max(5, 20 - (this.boardsCleared * 2));
            score += developmentBonus * difficultyMultiplier;
        }
        
        // Check-giving moves become much more valued
        const tempBoard = this.cloneBoard();
        tempBoard[move.row][move.col] = tempBoard[fromRow][fromCol];
        tempBoard[fromRow][fromCol] = null;
        if (this.wouldGiveCheck(tempBoard, 'white')) {
            const checkBonus = isExpertMode ? 80 : (isHardMode ? 60 : 40);
            score += checkBonus * difficultyMultiplier;
        }
        
        // Much better danger avoidance
        if (this.isSquareUnderAttack(move.row, move.col, 'black')) {
            let dangerPenalty = (pieceValues[piece.type] * difficultyMultiplier) / 2;
            
            // Expert mode: only move into danger if there's a very good reason
            if (isExpertMode && !target) {
                dangerPenalty *= 2;
            }
            
            score -= dangerPenalty;
        }
        
        // Advanced tactical patterns
        if (isHardMode) {
            // Tactical threats (forks, pins, skewers)
            if (this.createsTacticalThreat(fromRow, fromCol, move)) {
                score += 40 * difficultyMultiplier;
            }
            
            // Advanced pawn structure
            if (piece.type === 'pawn') {
                score += this.evaluatePawnStructure(fromRow, fromCol, move) * difficultyMultiplier;
            }
            
            // Piece activity and mobility
            score += this.evaluatePieceMobility(move) * difficultyMultiplier;
        }
        
        // Expert mode: Long-term strategic thinking
        if (isExpertMode) {
            // Control key squares
            score += this.evaluateKeySquareControl(move) * difficultyMultiplier;
            
            // Endgame awareness
            const pieceCount = this.countPieces();
            if (pieceCount.total < 12) {
                score += this.evaluateEndgamePosition(fromRow, fromCol, move) * difficultyMultiplier;
            }
        }
        
        // King safety is critical for harder AIs
        if (piece.type === 'king' && this.exposesKing(fromRow, fromCol, move)) {
            const kingSafetyPenalty = isExpertMode ? 60 : (isHardMode ? 40 : 20);
            score -= kingSafetyPenalty * difficultyMultiplier;
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
    
    evaluatePieceCoordination(fromRow, fromCol, move) {
        // Evaluate how well pieces support each other
        let coordination = 0;
        const piece = this.board[fromRow][fromCol];
        
        // Count friendly pieces that can defend this square
        let defenders = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const ally = this.board[row][col];
                if (ally && ally.color === piece.color && !(row === fromRow && col === fromCol)) {
                    const moves = this.getValidMovesWithoutCheckFilter(row, col);
                    if (moves.some(m => m.row === move.row && m.col === move.col)) {
                        defenders++;
                    }
                }
            }
        }
        
        coordination += defenders * 5;
        return coordination;
    }
    
    evaluateKingSafety(move) {
        // Find black king and evaluate safety around the move
        let kingRow = -1, kingCol = -1;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === 'black') {
                    kingRow = row;
                    kingCol = col;
                    break;
                }
            }
            if (kingRow !== -1) break;
        }
        
        if (kingRow === -1) return 0;
        
        // Prefer moves that keep pieces near the king
        const distance = Math.abs(move.row - kingRow) + Math.abs(move.col - kingCol);
        return Math.max(0, 8 - distance);
    }
    
    evaluatePawnStructure(fromRow, fromCol, move) {
        let structure = 0;
        
        // Prefer advancing pawns
        if (move.row < fromRow) {
            structure += 10;
        }
        
        // Avoid isolated pawns
        const hasAdjacentPawn = this.hasAdjacentPawn(move.row, move.col, 'black');
        if (!hasAdjacentPawn) {
            structure -= 5;
        }
        
        return structure;
    }
    
    hasAdjacentPawn(row, col, color) {
        for (let c = col - 1; c <= col + 1; c += 2) {
            if (c >= 0 && c < 8) {
                for (let r = 0; r < 8; r++) {
                    const piece = this.board[r][c];
                    if (piece && piece.type === 'pawn' && piece.color === color) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    evaluatePieceMobility(move) {
        // Prefer moves that increase piece mobility
        let mobility = 0;
        
        // Create temp board with move made
        const tempBoard = this.cloneBoard();
        const piece = tempBoard[move.row][move.col];
        if (piece) {
            // Count available moves from new position
            const availableMoves = this.getValidMovesWithoutCheckFilter(move.row, move.col);
            mobility = availableMoves.length;
        }
        
        return mobility;
    }
    
    evaluateKeySquareControl(move) {
        // Key squares are center and around enemy king
        const keySquares = [
            [3, 3], [3, 4], [4, 3], [4, 4], // Center squares
        ];
        
        // Add squares around white king
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === 'white') {
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const r = row + dr, c = col + dc;
                            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                                keySquares.push([r, c]);
                            }
                        }
                    }
                    break;
                }
            }
        }
        
        // Check if move controls any key squares
        for (const [kr, kc] of keySquares) {
            if (move.row === kr && move.col === kc) {
                return 15;
            }
        }
        return 0;
    }
    
    countPieces() {
        let white = 0, black = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (piece.color === 'white') white++;
                    else black++;
                }
            }
        }
        return { white, black, total: white + black };
    }
    
    evaluateEndgamePosition(fromRow, fromCol, move) {
        // In endgame, centralize king and activate pieces
        let endgameScore = 0;
        const piece = this.board[fromRow][fromCol];
        
        if (piece.type === 'king') {
            // Centralize king in endgame
            const centerDistance = Math.abs(3.5 - move.row) + Math.abs(3.5 - move.col);
            endgameScore += (7 - centerDistance) * 5;
        }
        
        if (piece.type === 'rook' || piece.type === 'queen') {
            // Activate major pieces
            endgameScore += 10;
        }
        
        return endgameScore;
    }
    
    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }
    
    isSquareUnderAttack(row, col, byColor) {
        const enemyColor = byColor === 'white' ? 'black' : 'white';
        
        for (let r = 0; r < 8; r++) {
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
        for (let row = 0; row < 8; row++) {
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
        
        for (let r = 0; r < 8; r++) {
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
        for (let row = 0; row < 8; row++) {
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
        for (let row = 0; row < 8; row++) {
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
        for (let row = 0; row < 8; row++) {
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
        for (let row = 0; row < 8; row++) {
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
    
    updateBoardsCleared() {
        document.getElementById('boards-cleared').textContent = this.boardsCleared;
    }
    
    advanceToNextBoard() {
        // Show victory message
        const status = document.getElementById('status');
        status.textContent = `Board ${this.boardsCleared} cleared! Choose reinforcement...`;
        status.style.color = '#27ae60';
        
        // Show piece selection after a brief delay
        setTimeout(() => {
            this.showPieceSelection();
        }, 1500);
    }
    
    proceedToNextBoard() {
        // Reset for next board
        this.currentTurn = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.lastMove = null;
        this.isCheck = false;
        this.isCheckmate = false;
        this.isStalemate = false;
        
        // Set up new board with surviving white pieces
        this.setupBoard();
        this.renderBoard();
        this.addLogEntry(`=== Board ${this.boardsCleared + 1} ===`, true);
    }
    
    endGame() {
        this.isGameOver = true;
        const status = document.getElementById('status');
        status.textContent = `Game Over! You cleared ${this.boardsCleared} board${this.boardsCleared !== 1 ? 's' : ''}!`;
        status.style.color = '#e74c3c';
        this.addLogEntry(`Game Over - ${this.boardsCleared} boards cleared`, true);
    }
    
    debugCaptureBlackKing() {
        if (this.isGameOver) return;
        
        // Find and capture the black king
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === 'black' && piece.type === 'king') {
                    this.capturedPieces.black.push(piece);
                    this.board[row][col] = null;
                    this.addLogEntry(`DEBUG: Black king captured - advancing to next board`, true);
                    this.boardsCleared++;
                    this.advanceToNextBoard();
                    return;
                }
            }
        }
    }
    
    debugKillAllWhitePieces() {
        if (this.isGameOver) return;
        
        let piecesKilled = 0;
        
        // Remove all white pieces from the board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === 'white') {
                    this.capturedPieces.white.push(piece);
                    this.board[row][col] = null;
                    piecesKilled++;
                }
            }
        }
        
        // Clear the white army
        if (this.whiteArmy) {
            this.whiteArmy.forEach(piece => {
                if (!this.capturedPieces.white.includes(piece)) {
                    this.capturedPieces.white.push(piece);
                }
            });
            this.whiteArmy = [];
        }
        
        if (piecesKilled > 0) {
            this.addLogEntry(`DEBUG: All ${piecesKilled} white pieces eliminated`, true);
            this.renderBoard();
            this.endGame();
        }
    }
    
    debugWinBoard() {
        if (this.isGameOver) return;
        
        console.log('DEBUG: Debug win button clicked');
        this.addLogEntry(`DEBUG: Board ${this.boardsCleared + 1} manually completed`, true);
        this.boardsCleared++;
        
        // Update game state
        this.selectedSquare = null;
        this.validMoves = [];
        
        console.log('DEBUG: About to call advanceToNextBoard');
        this.advanceToNextBoard();
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
            
            // King captures are handled in makeMove
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
        return `Board ${this.boardsCleared + 1} Black`;
    }
    
    getArmyNumber(row) {
        return this.boardsCleared + 1;
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
    
    showPromotionModal() {
        document.getElementById('promotion-modal-overlay').style.display = 'block';
    }
    
    hidePromotionModal() {
        document.getElementById('promotion-modal-overlay').style.display = 'none';
    }
    
    showPieceSelection() {
        console.log('DEBUG: showPieceSelection called');
        const pieces = this.generateRandomPieces();
        console.log('DEBUG: Generated pieces:', pieces);
        this.populatePieceSelectionModal(pieces);
        const modal = document.getElementById('piece-selection-modal-overlay');
        console.log('DEBUG: Modal element:', modal);
        modal.style.display = 'block';
        console.log('DEBUG: Modal display set to block');
    }
    
    hidePieceSelection() {
        document.getElementById('piece-selection-modal-overlay').style.display = 'none';
    }
    
    generateRandomPieces() {
        const pieces = [];
        const usedTypes = new Set();
        
        // Weighted piece pool with rarities
        const piecePool = [
            // Common (30%) - Pawn
            { type: 'pawn', rarity: 'common', weight: 30 },
            // Common (20% each) - Rook, Knight, Bishop  
            { type: 'rook', rarity: 'common', weight: 20 },
            { type: 'knight', rarity: 'common', weight: 20 },
            { type: 'bishop', rarity: 'common', weight: 20 },
            // Rare (8%) - Queen
            { type: 'queen', rarity: 'rare', weight: 8 },
            // Legendary (2%) - King
            { type: 'king', rarity: 'legendary', weight: 2 }
        ];
        
        // Generate 3 unique pieces
        while (pieces.length < 3) {
            const selectedPiece = this.getWeightedRandomPiece(piecePool);
            
            // Only add if we haven't used this type yet
            if (!usedTypes.has(selectedPiece.type)) {
                pieces.push({
                    type: selectedPiece.type,
                    rarity: selectedPiece.rarity,
                    symbol: this.pieces.white[selectedPiece.type],
                    id: `reward-${selectedPiece.type}-${Date.now()}-${Math.random()}`
                });
                usedTypes.add(selectedPiece.type);
            }
        }
        
        return pieces;
    }
    
    getWeightedRandomPiece(piecePool) {
        const totalWeight = piecePool.reduce((sum, piece) => sum + piece.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const piece of piecePool) {
            random -= piece.weight;
            if (random <= 0) {
                return piece;
            }
        }
        
        // Fallback (shouldn't happen)
        return piecePool[0];
    }
    
    populatePieceSelectionModal(pieces) {
        const choicesContainer = document.getElementById('piece-selection-choices');
        choicesContainer.innerHTML = '';
        
        pieces.forEach((piece, index) => {
            const pieceContainer = document.createElement('div');
            pieceContainer.className = 'piece-container';
            
            const pieceNameLabel = document.createElement('div');
            pieceNameLabel.className = 'piece-name-label';
            pieceNameLabel.textContent = piece.type.charAt(0).toUpperCase() + piece.type.slice(1);
            
            const button = document.createElement('button');
            button.className = `piece-selection-choice rarity-${piece.rarity}`;
            button.dataset.pieceType = piece.type;
            button.dataset.pieceId = piece.id;
            button.innerHTML = `
                <div style="font-size: 50px;">${piece.symbol}</div>
            `;
            
            const rarityLabel = document.createElement('div');
            rarityLabel.className = `rarity-label rarity-${piece.rarity}`;
            rarityLabel.textContent = piece.rarity;
            
            button.addEventListener('click', () => {
                this.selectPiece(piece);
            });
            
            pieceContainer.appendChild(pieceNameLabel);
            pieceContainer.appendChild(button);
            pieceContainer.appendChild(rarityLabel);
            choicesContainer.appendChild(pieceContainer);
        });
    }
    
    selectPiece(piece) {
        // Add the selected piece to the white army
        const newPiece = {
            type: piece.type,
            color: 'white',
            hasMoved: false,
            id: piece.id
        };
        
        this.whiteArmy.push(newPiece);
        this.addLogEntry(`Added ${piece.type} to your army!`, true);
        this.hidePieceSelection();
        
        // Proceed to next board
        this.proceedToNextBoard();
    }
    
    completePawnPromotion(pieceType) {
        if (!this.pendingPromotion) return;
        
        const { row, col, piece } = this.pendingPromotion;
        piece.type = pieceType;
        
        // Update the piece in the white army if it exists there
        if (this.whiteArmy) {
            const armyPiece = this.whiteArmy.find(p => p.id === piece.id);
            if (armyPiece) {
                armyPiece.type = pieceType;
            }
        }
        
        this.addLogEntry(`White pawn promoted to ${pieceType} at ${this.getSquareName(row, col)}`, true);
        this.hidePromotionModal();
        this.pendingPromotion = null;
        
        // Continue with normal game flow
        this.finalizeTurn();
    }
    
    finalizeTurn() {
        // Update game state
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
        
        // Check if white has no pieces left
        if (this.whiteArmy.length === 0) {
            this.endGame();
            return;
        }
        
        // Computer move
        if (this.currentTurn === 'black' && !this.isCheckmate && !this.isStalemate && !this.isGameOver) {
            setTimeout(() => this.makeComputerMove(), 500);
        }
    }
    
    resetGame() {
        this.currentTurn = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.lastMove = null;
        this.capturedPieces = { white: [], black: [] };
        this.boardsCleared = 0;
        this.isCheck = false;
        this.isCheckmate = false;
        this.isStalemate = false;
        this.moveLog = [];
        this.whiteArmy = null;
        this.isGameOver = false;
        this.pendingPromotion = null;
        this.pendingPieceSelection = null;
        this.hidePromotionModal();
        this.hidePieceSelection();
        
        this.setupBoard();
        this.renderBoard();
        this.updateLogDisplay();
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});