# Bhasha Setu - भाषा सेतु 🌉

A powerful OCR and translation web application that bridges language barriers using advanced text extraction and high-quality translation capabilities.

## 🚀 Features

### Core Functionality
- **📸 OCR Text Extraction**: Extract text from images using Tesseract.js
- **🌍 Multi-Language Translation**: Support for 6 languages including Hindi, Marathi, Tamil, Telugu, Spanish, and French
- **📝 Translation History**: Store and manage translation history with MongoDB
- **🔊 Text-to-Speech**: Voice synthesis for translated text
- **📱 Mobile-Friendly**: Responsive design optimized for all devices

### Advanced Features
- **🧠 High-Quality Translation**: Context-aware translation with sentence-level accuracy
- **🔒 Security & Validation**: Input validation, rate limiting, and secure API handling
- **⚡ Performance Optimized**: Error boundaries, graceful error handling, and efficient caching
- **🎨 Beautiful UI**: Modern design with Tailwind CSS and intuitive user experience

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** for data storage
- **Tesseract.js** for OCR
- **MyMemory API** for translation
- **Joi** for validation
- **express-rate-limit** for security

### Frontend
- **React** with modern hooks
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Lucide React** for icons
- **Sonner** for notifications

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

## 🚀 Quick Start

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=bhasha_setu
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:8001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

5. Start the frontend application:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## 🌐 Supported Languages

| Language | Code | Native Name |
|----------|------|-------------|
| Hindi | `hi` | हिन्दी |
| Marathi | `mr` | मराठी |
| Tamil | `ta` | தமிழ் |
| Telugu | `te` | తెలుగు |
| Spanish | `es` | Español |
| French | `fr` | Français |

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
- `MONGO_URL`: MongoDB connection string
- `DB_NAME`: Database name for storing translations
- `CORS_ORIGINS`: Comma-separated list of allowed origins

#### Frontend (.env)
- `REACT_APP_BACKEND_URL`: Backend API URL

## 📡 API Endpoints

- `GET /api/` - Health check
- `GET /api/languages` - Get supported languages
- `POST /api/process` - Process image and translate text
- `GET /api/history` - Get translation history
- `DELETE /api/history/:id` - Delete translation item

## 🔒 Security Features

- **Input Validation**: All API endpoints validate input using Joi
- **Rate Limiting**: 100 requests/15min general, 20 uploads/15min for image processing
- **File Size Limits**: Maximum 10MB per image
- **CORS Protection**: Configurable CORS origins
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 📱 Mobile Support

- **Touch-Friendly Interface**: Optimized for mobile devices
- **Camera Integration**: Direct camera access for photo capture
- **Responsive Design**: Works seamlessly on all screen sizes
- **Progressive Web App**: PWA capabilities for better mobile experience

## 🧠 Translation Quality

The application features advanced translation capabilities:

- **Context-Aware Translation**: Maintains sentence meaning and structure
- **Mixed Language Support**: Handles text with multiple languages intelligently
- **Technical Terminology**: Proper translation of technical terms
- **Grammar Improvements**: Post-processing for natural language output

## 🐛 Troubleshooting

### Common Issues

1. **Backend won't start**: Check MongoDB connection and environment variables
2. **Translation errors**: Verify MyMemory API accessibility
3. **OCR issues**: Ensure images are clear and text is readable
4. **Mobile upload problems**: Check camera permissions and file formats

### Error Messages

- `"कृपया एक फोटो अपलोड करें।"` - Please upload an image first
- `"फाइल बहुत बड़ी है"` - File size exceeds 10MB limit
- `"टेक्स्ट नहीं मिला"` - No text could be extracted from image

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Tesseract.js** for OCR capabilities
- **MyMemory Translation API** for translation services
- **Tailwind CSS** for beautiful styling
- **React** for the frontend framework

## 📞 Support

For support and questions, please open an issue in the GitHub repository.

---

**Bhasha Setu** - Bridging languages, connecting people 🌉
