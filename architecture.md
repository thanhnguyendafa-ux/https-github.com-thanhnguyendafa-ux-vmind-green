1. Mục tiêu & Phạm vi (Goals & Scope)
Mục tiêu hệ thống: Xây dựng Vmind trở thành một ứng dụng học từ vựng chuyên sâu, toàn diện và hấp dẫn (gamified) dành cho người học nghiêm túc. Hệ thống phải mang lại trải nghiệm mượt mà, cá nhân hóa và có khả năng đồng bộ hóa trên nhiều thiết bị.
Yêu cầu chức năng (Functional):
Quản lý bộ từ vựng (Tables): Tạo, sửa, xóa, import/export các bộ từ vựng tùy chỉnh.
Các chế độ học tập đa dạng: Flashcards (lặp lại ngắt quãng), Multiple Choice, Typing, True/False.
Hỗ trợ học tập bằng AI: Gemini API được dùng để giải thích từ, tạo câu ví dụ, phát âm.
Theo dõi tiến độ: Hệ thống XP, cấp độ (level), chuỗi học tập (streak) và huy hiệu (badges).
Tính năng phụ trợ: Reading Space (đọc và trích xuất từ vựng), Journal (nhật ký học tập).
Cộng đồng: Chia sẻ và tải về các bộ từ vựng từ thư viện chung (Community Library).
Yêu cầu phi chức năng (Non-functional):
Performance: Giao diện phản hồi nhanh, thời gian tải dưới 3 giây. Tối ưu cho các bộ từ vựng lớn (>1000 từ).
Offline-first: Người dùng khách (Guest) có thể sử dụng các tính năng cốt lõi offline nhờ localStorage.
Availability: Đảm bảo uptime 99.9% cho các dịch vụ backend (Supabase).
Scalability: Kiến trúc backend (Supabase) có khả năng mở rộng. Frontend phải được thiết kế để không bị suy giảm hiệu năng khi thêm tính năng mới.
Maintainability: Codebase phải dễ đọc, dễ hiểu và dễ nâng cấp.
Lý do xây dựng: Vmind giải quyết vấn đề của các phương pháp học từ vựng truyền thống (nhàm chán, kém hiệu quả) bằng cách tích hợp gamification, thuật toán lặp lại ngắt quãng và sức mạnh của AI, tạo ra một công cụ học tập cá nhân hóa và hiệu quả cao.
2. Nguyên tắc thiết kế & Triết lý kiến trúc
Nguyên tắc Code Base:
Single Responsibility Principle (SRP): Mỗi component/module chỉ đảm nhiệm một chức năng duy nhất. Ví dụ: HomeScreen chỉ hiển thị tổng quan, TableScreen quản lý chi tiết một table. Cần tiếp tục chia nhỏ các component lớn như TableScreen.tsx.
Don't Repeat Yourself (DRY): Tái sử dụng hooks, components, và utility functions. useLocalStorage là một ví dụ tốt.
Keep It Simple, Stupid (KISS): Ưu tiên các giải pháp đơn giản và hiệu quả. Tránh lạm dụng các thư viện phức tạp khi chưa cần thiết.
Lựa chọn kiến trúc:
Frontend: Modular Monolith. Hiện tại, Vmind là một Single Page Application (SPA) được tổ chức theo từng "module" chức năng (màn hình). Đây là lựa chọn phù hợp, cân bằng giữa tốc độ phát triển và khả năng tổ chức code. Khi ứng dụng phức tạp hơn, có thể xem xét Micro-Frontends.
Backend: Backend-as-a-Service (BaaS). Sử dụng Supabase là một quyết định chiến lược đúng đắn, giúp giảm tải công việc backend, tập trung vào trải nghiệm người dùng.
Domain-Driven Design (DDD): Các khái niệm cốt lõi đã được định nghĩa trong types.ts (Table, VocabRow, UserStats). Cần chính thức hóa các Bounded Contexts (ví dụ: Learning, UserManagement, Content) để các quyết định về sau được nhất quán.
3. Thiết kế API & Giao tiếp
External APIs:
Supabase: Giao tiếp qua Supabase JS Client, tuân thủ theo các phương thức mà thư viện cung cấp.
Gemini API: Toàn bộ logic gọi Gemini được đóng gói trong services/geminiService.ts. Đây là một pattern tốt, giúp dễ dàng thay thế hoặc nâng cấp model AI sau này.
Error Handling Standard: Cần chuẩn hóa việc xử lý lỗi từ API. geminiService.ts đã có bước đầu trong việc bắt lỗi API_KEY_MISSING. Cần mở rộng:
Tạo một Global Error Boundary trong React để bắt các lỗi render.
Sử dụng một hàm handleApiError chung để xử lý lỗi mạng, lỗi 4xx, 5xx và hiển thị thông báo nhất quán cho người dùng qua Toast/Notification.
4. Frontend Architecture
Tổ chức thư mục: Cấu trúc hiện tại (components, hooks, services) là tốt cho khởi đầu. Khi dự án lớn hơn, nên chuyển sang cấu trúc theo feature/domain:
code
Code
/src
  /features
    /TableManagement
      /components (TableCard, TableScreen)
      /hooks (useTableData)
      /services
    /StudySession
      /...
State Management: App.tsx đang quản lý quá nhiều state và thực hiện "prop drilling".
Chiến lược: Chuyển đổi sang một giải pháp quản lý state toàn cục.
Đề xuất:
React Context + useReducer: Cho các state liên quan chặt chẽ (ví dụ: StudySessionContext).
Zustand: Cho các state toàn cục, ít liên quan hơn (ví dụ: UserStatsStore, SettingsStore). Giải pháp này nhẹ nhàng và hiệu quả hơn Redux cho quy mô hiện tại.
UI Component System: Xem mục 5.
5. UI/UX & Design System
Design Tokens: Chuẩn hóa các giá trị thiết kế. Tạo file tailwind.config.js để định nghĩa:
Colors: primary, secondary, success, error, text-main, text-subtle.
Typography: font-size (h1, h2, body, caption), font-family.
Spacing: Hệ thống khoảng cách dựa trên một đơn vị cơ sở (ví dụ: 4px).
Component Library: Xây dựng thư viện component tái sử dụng dựa trên các atom nhỏ nhất.
Ví dụ: Tạo <Button variant="primary" size="md">, <Input>, <Card>, <Modal>. Component Modal.tsx và Toast.tsx là những khởi đầu tốt.
Khuyến nghị: Sử dụng Storybook để phát triển và tài liệu hóa các component này một cách độc lập, giúp đảm bảo tính nhất quán và dễ dàng kiểm thử.
Accessibility (A11y) & Responsive:
Luôn đảm bảo các yếu tố tương tác (button, input) có aria-label phù hợp.
Kiểm tra khả năng điều hướng bằng bàn phím (tab-index).
Thiết kế phải responsive trên các kích thước màn hình phổ biến (mobile, tablet, desktop). Tailwind CSS hỗ trợ rất tốt việc này.
6. Iconography & Assets Rules
Iconography: Icon.tsx hiện tại hardcode SVG path.
Quy tắc: Tất cả icons phải được thiết kế trên lưới 24x24px, tuân thủ phong cách outline với stroke-width: 1.5 để đồng nhất.
Phong cách: Icon được tạo liên quan đến hình ảnh học tập
Tối ưu: Chuyển đổi mỗi icon thành một component SVG riêng biệt và import khi cần, hoặc sử dụng thư viện như react-icons. Điều này hỗ trợ tree-shaking, giảm kích thước bundle.
Assets:
Hình ảnh: Mọi hình ảnh (ví dụ: ảnh trong flashcard) phải được nén trước khi sử dụng. Ưu tiên định dạng WebP.
Lazy Loading: Áp dụng lazy loading cho hình ảnh và các component không cần thiết ngay lúc đầu.
7. Backend Design & Data Layer
Database: Supabase sử dụng PostgreSQL, đây là lựa chọn mạnh mẽ và đáng tin cậy.
Data Structure: Dữ liệu người dùng (app_data) đang được lưu dưới dạng một cột JSONB duy nhất.
Ưu điểm: Dễ dàng fetch và save toàn bộ trạng thái.
Nhược điểm: Sẽ trở thành bottleneck khi dữ liệu lớn. Không thể query sâu vào bên trong JSON một cách hiệu quả.
Chiến lược dài hạn: Khi người dùng có lượng dữ liệu lớn, cần tách các domain chính (tables, notes, stats) ra thành các bảng riêng trong PostgreSQL để tối ưu hóa truy vấn.
Data Caching: Sử dụng thư viện như React Query (TanStack Query) để quản lý server state. Nó sẽ tự động xử lý caching, re-fetching, và các trạng thái loading/error, giúp đơn giản hóa code trong components.
8. Security & Compliance
Authentication & Authorization:
Authentication: Supabase Auth đã xử lý tốt.
Authorization: Cực kỳ quan trọng: Phải kích hoạt Row Level Security (RLS) trên bảng profiles của Supabase. Tạo policy để đảm bảo user chỉ có thể đọc và ghi vào dòng có id trùng với auth.uid() của chính họ.
Input Validation: Luôn xác thực dữ liệu đầu vào từ người dùng ở cả frontend và backend (thông qua Postgres Functions nếu cần) để chống lại các cuộc tấn công.
API Keys: process.env.API_KEY cho Gemini là cách tiếp cận đúng. Key này không bao giờ được lộ ra phía client.
9. Performance & Scalability
Tối ưu Frontend:
Code Splitting: Sử dụng React.lazy() để tách các màn hình thành các chunk riêng, chỉ tải khi người dùng truy cập.
Memoization: Sử dụng React.memo, useMemo, useCallback để tránh re-render không cần thiết. TableScreen.tsx đã áp dụng list virtualization, đây là một kỹ thuật rất tốt.
Pagination: Khi một Table có quá nhiều Rows, cần triển khai pagination thay vì tải toàn bộ.
Tối ưu Backend (Supabase):
Indexing: Khi chuyển sang các bảng riêng, cần đánh index cho các cột thường được truy vấn (ví dụ: table_id, user_id).
CDN: Supabase đã tích hợp sẵn CDN cho các assets, cần tận dụng.
10. Observability (Monitoring / Logging / Tracing)
Logging & Error Monitoring: Tích hợp một dịch vụ như Sentry hoặc LogRocket.
Sentry: Tự động bắt và báo cáo các lỗi Javascript xảy ra trên trình duyệt của người dùng.
LogRocket: Ghi lại session của người dùng, giúp tái hiện lỗi một cách trực quan.
Performance Monitoring: Theo dõi các chỉ số Core Web Vitals (LCP, FID, CLS) để đảm bảo trải nghiệm người dùng luôn tốt.
11. CI/CD & DevOps Pipelines
CI/CD Pipeline: Thiết lập pipeline tự động bằng GitHub Actions (hoặc tương đương).
Trigger: Khi có push/merge vào branch main hoặc develop.
Steps:
Install Dependencies: npm install
Lint & Format: npm run lint
Type Check: tsc --noEmit
Test: npm test
Build: npm run build
Deploy: Tự động deploy lên Vercel/Netlify.
Environments: Cần có ít nhất 3 môi trường: development (local), staging (mirror production), và production. Mỗi môi trường sẽ kết nối đến một project Supabase riêng.
12. Testing Strategy
Codebase hiện chưa có test. Cần xây dựng một chiến lược kiểm thử toàn diện:
Unit Tests (Vitest/Jest + RTL): Kiểm thử các hàm logic (trong utils), các hooks, và từng component UI nhỏ.
Integration Tests (RTL): Kiểm thử sự tương tác giữa các components trong một màn hình. Ví dụ: Thêm một từ vựng vào bảng và xác nhận nó xuất hiện trong danh sách.
End-to-End (E2E) Tests (Cypress/Playwright): Tự động hóa các luồng người dùng quan trọng nhất: Đăng ký -> Đăng nhập -> Tạo Table -> Bắt đầu một Study Session.
13. Versioning & Release Strategy
Versioning: Áp dụng Semantic Versioning (MAJOR.MINOR.PATCH).
Release Strategy:
Sử dụng Feature Flags/Toggles để bật/tắt các tính năng lớn. Điều này cho phép deploy code mới ra production nhưng chỉ kích hoạt cho một nhóm người dùng (hoặc nội bộ) để kiểm thử trước khi public rộng rãi.
Luôn có kế hoạch Rollback: Có khả năng quay trở lại phiên bản ổn định trước đó một cách nhanh chóng nếu bản release mới gặp sự cố nghiêm trọng.
14. Operational Playbooks
Xây dựng các tài liệu "runbook" để xử lý các sự cố thường gặp:
Sự cố API: Phải làm gì khi Supabase hoặc Gemini API bị gián đoạn? (Hiển thị banner bảo trì, vô hiệu hóa các tính năng liên quan).
Sự cố Đồng bộ hóa: Hướng dẫn quy trình debug khi người dùng báo cáo mất dữ liệu hoặc dữ liệu không đồng bộ.
15. Documentation & Knowledge Base
Architecture Documentation: Chính tài liệu này là khởi đầu. Cần được cập nhật thường xuyên khi có những thay đổi lớn về kiến trúc.
Component Documentation: Sử dụng Storybook như đã đề cập. Đây sẽ là nguồn tài liệu sống (living documentation) cho toàn bộ Design System.
Knowledge Base: Sử dụng một nền tảng wiki nội bộ (Notion, Confluence, hoặc GitHub Wiki) để lưu trữ các quyết định kiến trúc, hướng dẫn setup môi trường, và các quy trình phát triển chung của team.