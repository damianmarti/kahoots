import { withAdmin } from '../../../lib/auth';

export default withAdmin(async (req, res, admin) => {
  res.status(200).json({ admin });
});
